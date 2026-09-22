"""Voxel-unioned skin, partitioned with preserved normals into named regions."""
import math
import bpy
from mathutils import Vector
from config import PARAMS as P
from geometry import basis, ellipsoid, mesh


def skin_color(p):
    foot = max(0.0, min(1.0, (0.26 - p.z) / 0.095))
    cream = Vector((0.68, 0.455, 0.255))
    if p.y < -0.95:
        cream = Vector((0.73, 0.505, 0.275))
    elif p.z < 0.80:
        cream = Vector((0.74, 0.525, 0.31))
    brown = Vector((0.22, 0.083, 0.035))
    color = cream.lerp(brown, foot)
    if p.y < -1.20:
        for sign in [-1, 1]:
            dx = (p.x - sign * P["eye_x"]) / P["eye_width"]
            dz = (p.z - P["eye_z"]) / P["eye_height"]
            ring = math.exp(-((math.hypot(dx, dz) - 1.14) / 0.22) ** 2)
            upper = max(0.0, min(1.0, dz + 0.20))
            color = color.lerp(Vector((0.30, 0.155, 0.066)), ring * upper * 0.50)
    grain = 1 + 0.018 * math.sin(p.x * 79 + math.sin(p.y * 41) + p.z * 101)
    return (*[v * grain for v in color], 1)


def region(p):
    if p.z < 0.52 and abs(p.x) > 0.28:
        end = "Front" if p.y < 0.17 else "Hind"
        side = "L" if p.x > 0 else "R"
        return ("Paw_" if p.z < 0.185 else "Limb_") + end + "_" + side
    if p.y < -1.02:
        return "Head"
    return "Body"


def build_skin(mat):
    volumes = [ellipsoid("Body_Volume", P["body_center"], P["body_radii"]),
               ellipsoid("Head_Volume", P["head_center"], P["head_radii"]),
               ellipsoid("Throat_Volume", (0, -0.71, 0.90), (0.42, 0.44, 0.34)),
               ellipsoid("Muzzle_Volume", (0, -1.40, 1.12), (0.285, 0.40, 0.205)),
               ellipsoid("Snout_Volume", (0, -1.70, 1.18), (0.18, 0.235, 0.148))]
    for sign in [-1, 1]:
        volumes.append(ellipsoid("Cheek_Volume", (sign * 0.31, -1.20, 1.16), (0.275, 0.31, 0.245)))
        volumes.append(ellipsoid("Muzzle_Pad_Volume", (sign * 0.113, -1.68, 1.11), (0.145, 0.18, 0.126)))
        for y in [P["front_y"], P["rear_y"]]:
            x = sign * P["front_leg_x" if y == P["front_y"] else "rear_leg_x"]
            volumes += [ellipsoid("Upper_Volume", (x, y, 0.56), (0.225, 0.265, 0.40)),
                        ellipsoid("Lower_Volume", (x * 1.065, y - 0.025, 0.31), (0.15, 0.19, 0.29)),
                        ellipsoid("Paw_Volume", (x * 1.07, y - 0.12, 0.12), (0.195, 0.25, 0.12))]
            for toe in range(4):
                volumes.append(ellipsoid("Toe_Volume", (x * 1.07 + (toe - 1.5) * 0.083, y - 0.31, 0.10), (0.049, 0.095, 0.080), segments=20, rings=12))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in volumes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = volumes[0]
    bpy.ops.object.join()
    source = bpy.context.object
    source.name = "ContinuousSkin_Working"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    remesh = source.modifiers.new("Continuous organic union", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = P["voxel_size"]
    remesh.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    relax = source.modifiers.new("Relax volume intersections", "SMOOTH")
    relax.factor = 0.85
    relax.iterations = 5
    bpy.ops.object.modifier_apply(modifier=relax.name)
    # Sculpt a continuous socket around the shallow almond aperture.
    for vertex in source.data.vertices:
        for sign in [-1, 1]:
            center = Vector((sign * P["eye_x"], P["eye_y"], P["eye_z"]))
            u, v, n = basis((sign * 0.28, -0.96, 0.035))
            relative = vertex.co - center
            xx = relative.dot(u) / P["eye_width"]
            yy = relative.dot(v) / P["eye_height"]
            distance = math.sqrt(xx * xx + (yy / (0.58 + 0.42 * min(1, abs(yy)))) ** 2)
            depth = relative.dot(n)
            if distance < 1.65 and -0.22 < depth < 0.32:
                t = max(0.0, min(1.0, (distance - 0.94) / 0.71))
                influence = 1 - t * t * (3 - 2 * t)
                target = -0.018 + 0.032 * math.exp(-((distance - 1.10) / 0.23) ** 2)
                vertex.co += n * (target - depth) * influence
    subdiv = source.modifiers.new("Soft silhouette", "SUBSURF")
    subdiv.levels = 1
    bpy.ops.object.modifier_apply(modifier=subdiv.name)
    data = source.data
    for poly in data.polygons:
        poly.use_smooth = True
    data.update()
    neighbors = [[] for _ in data.vertices]
    for edge in data.edges:
        a, b = edge.vertices
        neighbors[a].append(b)
        neighbors[b].append(a)
    unseen = set(range(len(data.vertices)))
    components = 0
    while unseen:
        components += 1
        stack = [unseen.pop()]
        while stack:
            for nxt in neighbors[stack.pop()]:
                if nxt in unseen:
                    unseen.remove(nxt)
                    stack.append(nxt)
    assert components == 1, "Skin volumes must form one continuous surface"
    groups = {}
    for poly in data.polygons:
        center = sum((data.vertices[i].co for i in poly.vertices), Vector()) / len(poly.vertices)
        groups.setdefault(region(center), []).append(poly)
    parts = []
    for name, polys in groups.items():
        old_ids = sorted({i for poly in polys for i in poly.vertices})
        mapping = {old: new for new, old in enumerate(old_ids)}
        obj = mesh(name, [data.vertices[i].co[:] for i in old_ids],
                   [tuple(mapping[i] for i in poly.vertices) for poly in polys], [mat])
        obj.data.normals_split_custom_set_from_vertices([data.vertices[i].normal[:] for i in old_ids])
        attr = obj.data.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="POINT")
        for idx, old in enumerate(old_ids):
            attr.data[idx].color = skin_color(data.vertices[old].co)
        obj["semantic_part"] = name
        obj["surface"] = "Partition of one fused skin; matching boundary positions and normals"
        parts.append(obj)
    bpy.data.objects.remove(source, do_unlink=True)
    assert sum(p.name.startswith("Limb_") for p in parts) == 4
    assert sum(p.name.startswith("Paw_") for p in parts) == 4
    assert sum(p.name == "Head" for p in parts) == 1
    return parts, {"continuousSkinComponentsBeforePartition": components,
                   "method": "Voxel union, relax, subdivision, named surface partitions with shared boundary normals"}
