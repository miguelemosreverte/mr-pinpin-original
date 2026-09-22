"""Deterministic surface-sampled groom, exported as ordinary mesh geometry."""
import bisect
import math
import random
import bpy
from mathutils import Matrix, Vector
from config import PARAMS as P, SEED
from geometry import basis, material, mesh, strand


def smoothstep(low, high, value):
    t = max(0.0, min(1.0, (value - low) / (high - low)))
    return t * t * (3 - 2 * t)


def neck_floor(p):
    return 0.62 + 0.40 * (1 - smoothstep(-0.35, 0.20, p.y))


def dorsal_weight(p):
    # Preserve the forward forehead; feather the mantle behind it.
    neck = -0.70 + 0.14 * (1 - min(1, abs(p.x) / 0.65))
    neck += 0.24 * (1 - smoothstep(0.95, 1.50, p.z))
    floor = neck_floor(p)
    return smoothstep(neck - 0.23, neck + 0.29, p.y) * smoothstep(floor, floor + 0.24, p.z)


def dorsal(p):
    return dorsal_weight(p) > 0.12


def surface_sampler(parts):
    bpy.context.view_layer.update()
    triangles, cumulative, total = [], [], 0.0
    for obj in sorted(parts, key=lambda item: item.name):
        data = obj.data
        data.calc_loop_triangles()
        transform = obj.matrix_world
        normal_transform = transform.to_3x3().inverted().transposed()
        points = [transform @ v.co for v in data.vertices]
        normals = [(normal_transform @ v.normal).normalized() for v in data.vertices]
        for tri in data.loop_triangles:
            a, b, c = (points[i] for i in tri.vertices)
            area = (b - a).cross(c - a).length * 0.5
            if area <= 1e-12:
                continue
            total += area
            cumulative.append(total)
            triangles.append((a, b, c, *(normals[i] for i in tri.vertices)))
    if not triangles:
        raise ValueError("Groom needs nonempty skin triangles")

    def sample(rng):
        a, b, c, na, nb, nc = triangles[bisect.bisect_left(cumulative, rng.random() * total)]
        u, v = math.sqrt(rng.random()), rng.random()
        w = (1 - u, u * (1 - v), u * v)
        return (a * w[0] + b * w[1] + c * w[2],
                (na * w[0] + nb * w[1] + nc * w[2]).normalized())
    return sample


def feature_exclusion():
    # Built feature bounds include their actual dimensions and orientation.
    bpy.context.view_layer.update()
    features = []
    for obj in bpy.context.scene.objects:
        is_eye = obj.name.startswith("Eye_") and obj.name.endswith("_Sclera")
        if not (is_eye or obj.name.startswith("Ear_") or obj.name == "Nose"):
            continue
        inverse = obj.matrix_world.inverted()
        bounds = [Vector(corner) for corner in obj.bound_box]
        if is_eye:
            # Shallow eye patches store world-space vertices, not local XY discs.
            normal_transform = obj.matrix_world.to_3x3().inverted().transposed()
            normal = sum((poly.normal * poly.area for poly in obj.data.polygons), Vector())
            if normal.length < 1e-6:
                normal = Vector((0, 0, 1))
            u, v, n = basis(normal_transform @ normal)
            inverse = Matrix((u, v, n)).to_4x4()
            bounds = [inverse @ (obj.matrix_world @ vertex.co) for vertex in obj.data.vertices]
        low = Vector(tuple(min(p[i] for p in bounds) for i in range(3)))
        high = Vector(tuple(max(p[i] for p in bounds) for i in range(3)))
        margin = 0.022 if is_eye else 0.012
        radii = (high - low) * 0.5 + Vector((margin, margin, margin))
        features.append((inverse, (low + high) * 0.5, radii, is_eye))

    def excluded(point):
        for inverse, center, radii, is_eye in features:
            q = inverse @ point - center
            radial = (q.x / radii.x) ** 2 + (q.y / radii.y) ** 2
            if is_eye:
                if radial < 1 and abs(q.z) < radii.z + 0.10:
                    return True
            elif radial + (q.z / radii.z) ** 2 < 1:
                return True
        return False
    return excluded


def build_undercoat(parts):
    vertices, faces = [], []
    for obj in parts:
        transform = obj.matrix_world
        normals = transform.to_3x3().inverted().transposed()
        for poly in obj.data.polygons:
            center = transform @ (sum((obj.data.vertices[i].co for i in poly.vertices), Vector()) / len(poly.vertices))
            if dorsal_weight(center) < 0.60:
                continue
            start = len(vertices)
            vertices.extend(tuple(transform @ obj.data.vertices[i].co
                                  + (normals @ obj.data.vertices[i].normal).normalized() * 0.001)
                            for i in poly.vertices)
            faces.append(tuple(start + j for j in range(len(poly.vertices))))
    obj = mesh("Dorsal_Soft_Undercoat", vertices, faces,
               [material("Warm brown undercoat", (0.14, 0.058, 0.025), 0.9)])
    obj["placement"] = "Actual dorsal skin, feathered mantle boundary"


def build_quills():
    rng = random.Random(SEED)
    coat = material("Quill continuous chestnut ivory", (1, 1, 1), 0.78)
    pigment = coat.node_tree.nodes.new("ShaderNodeVertexColor")
    pigment.layer_name = "Color"
    coat.node_tree.links.new(pigment.outputs["Color"], coat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
    color_rng = random.Random(SEED + 17)
    vertex_colors = []
    vertices, faces, colors, roots = [], [], [], []
    parts = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.name in {"Head", "Body"}]
    sample, excluded = surface_sampler(parts), feature_exclusion()
    count = max(0, int(P["quill_count"]))
    for attempt in range(max(1, count * 80)):
        if len(roots) >= count:
            break
        root, normal = sample(rng)
        density = dorsal_weight(root)
        if rng.random() >= density or excluded(root):
            continue
        flow = Vector((root.x * 0.30, 0.78, -0.28))
        tangent = flow - normal * flow.dot(normal)
        if tangent.length > 1e-6:
            tangent.normalize()
        sideways = normal.cross(tangent)
        direction = (normal * rng.uniform(0.55, 1.05) + tangent * rng.uniform(0.25, 0.85)
                     + sideways * rng.uniform(-0.24, 0.24)).normalized()
        length = rng.uniform(0.14, 0.30) * (0.10 + 0.90 * density)
        if rng.random() < 0.30:
            length *= 0.70
        width = rng.uniform(0.018, 0.028) * (0.15 + 0.85 * density)
        if root.z > P["body_center"][2] + 0.45 and rng.random() < 0.16:
            length *= 1.20
            width *= 0.72
        bend = tangent * (length * rng.uniform(0.09, 0.32))
        bend += Vector((rng.uniform(-0.009, 0.009), 0, rng.uniform(-0.009, 0.009))) * density
        # Reject swept tips crossing below the lower neck, not only their roots.
        path = [root + direction * length * t + bend * t * t for t in (0.52, 0.82, 1.0)]
        if any(p.y < 0.20 and p.z - width < neck_floor(p) for p in path):
            continue
        strand(vertices, faces, colors, root - normal * min(0.008, length * 0.12), direction, length, width, bend,
               [0] * 4, sides=6)
        # Match the five spindle rings: interpolation removes hard material bands.
        warmth = color_rng.uniform(0.78, 1.20)
        tip = Vector((0.42, 0.285, 0.15)) * color_rng.uniform(0.70, 1.08)
        shoulder = Vector((0.085, 0.028, 0.009)).lerp(tip, color_rng.uniform(0.12, 0.42))
        palette = [(0.055, 0.016, 0.005), (0.135, 0.044, 0.012),
                   (0.19, 0.070, 0.022), shoulder, tip]
        for color in palette:
            vertex_colors.extend([(*(channel * warmth for channel in color), 1)] * 6)
        roots.append(tuple(root))
    if len(roots) != count:
        raise RuntimeError("Dorsal surface cannot satisfy quill count")
    obj = mesh("Quills_Dorsal_Groom", vertices, faces, [coat], colors)
    attr = obj.data.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="POINT")
    assert len(vertex_colors) == len(vertices), "Quill pigment must cover every ring vertex"
    for datum, color in zip(attr.data, vertex_colors):
        datum.color = color
    obj["quill_count"] = len(roots)
    obj["placement"] = "Area-weighted actual dorsal skin; face, ears and belly excluded"
    obj["shape"] = "Varied layered chestnut spindles, interpolated muted ivory tips, fine crown accents"
    return {"count": len(roots), "rootBounds": [[min(p[i] for p in roots), max(p[i] for p in roots)] for i in range(3)] if roots else [],
            "faceExclusionApplied": True, "ventralExclusionApplied": True}


def fine_strand(vertices, faces, colors, root, direction, length, width, bend, index):
    # Three triangular rings plus a point: 16 triangles per curved hair.
    axis = Vector((1, 0, 0)) if abs(direction.x) < 0.8 else Vector((0, 1, 0))
    u = direction.cross(axis).normalized()
    v = direction.cross(u).normalized()
    start = len(vertices)
    for t, radius in [(0, 0.75), (0.38, 0.65), (0.73, 0.32)]:
        center = root + direction * length * t + bend * t * t
        for j in range(3):
            angle = math.tau * j / 3
            vertices.append(tuple(center + width * radius * (u * math.cos(angle) + v * math.sin(angle))))
    vertices.append(tuple(root + direction * length + bend))
    faces.append((start + 2, start + 1, start))
    colors.append(index)
    for ring in range(2):
        for j in range(3):
            a, b = start + ring * 3 + j, start + ring * 3 + (j + 1) % 3
            faces.append((a, b, b + 3, a + 3))
            colors.append(index)
    for j in range(3):
        faces.append((start + 6 + j, start + 6 + (j + 1) % 3, start + 9))
        colors.append(index)


def build_fur(parts):
    rng = random.Random(SEED + 1)
    mats = [material("Fur cream %d" % i, c, 0.92) for i, c in enumerate([
        (0.79, 0.63, 0.43), (0.87, 0.73, 0.53), (0.71, 0.53, 0.33), (0.83, 0.67, 0.46)])]
    vertices, faces, colors = [], [], []
    sample = surface_sampler([obj for obj in parts if not obj.name.startswith("Paw_")])
    excluded = feature_exclusion()
    target = min(44000, max(0, int(P["fur_count"] * 3)))
    count = 0
    for attempt in range(max(1, target * 50)):
        if count >= target:
            break
        p, normal = sample(rng)
        if p.z < 0.18 or rng.random() < dorsal_weight(p) * 0.97 or excluded(p):
            continue
        forehead = p.y < -0.65 and p.z > P["eye_z"] + 0.06
        muzzle = p.y < -1.48 and abs(p.x) < 0.30 and p.z < 1.30
        flow = Vector((p.x * 1.8, 0.22, 0.85 if forehead else -0.65))
        tangent = flow - normal * flow.dot(normal)
        if tangent.length > 1e-6:
            tangent.normalize()
        direction = (normal * rng.uniform(0.30, 0.48) + tangent).normalized()
        length = rng.uniform(0.045, 0.085)
        if forehead:
            length *= 1.22
        elif p.z < 0.95 and p.y < -0.60:
            length *= 1.30
        if muzzle:
            length *= 0.32
        if rng.random() < 0.12:
            length *= 1.35
        bend = normal * (length * 0.18) + tangent * (length * 0.12)
        bend += Vector((rng.uniform(-0.008, 0.008), rng.uniform(-0.006, 0.006), rng.uniform(-0.008, 0.008)))
        if any(excluded(p + direction * length * t + bend * t * t) for t in (0.4, 0.75, 1.0)):
            continue
        fine_strand(vertices, faces, colors, p - normal * 0.001, direction,
                    length, rng.uniform(0.0007, 0.00125), bend, rng.randrange(len(mats)))
        count += 1
    if count != target:
        raise RuntimeError("Skin surface cannot satisfy fur count")
    obj = mesh("Fur_Short_Cream", vertices, faces, mats, colors)
    obj["groom"] = "Area-weighted swept forehead, outward cheeks, soft chest; actual feature exclusions"
    obj["strand_count"] = count
