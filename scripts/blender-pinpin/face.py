"""Inset almond eyes, cupped ears and a small shaped muzzle."""
import math
import bpy
from mathutils import Vector
from config import PARAMS as P
from geometry import basis, ellipsoid, material, mesh, tube


def aperture(t):
    s = math.sin(t)
    return P["eye_width"] * math.cos(t), P["eye_height"] * s * (0.58 + 0.42 * abs(s))


def inside_eye(x, y):
    xx = x / P["eye_width"]
    if abs(xx) >= 1:
        return False
    sy = math.sqrt(1 - xx * xx)
    return abs(y) <= P["eye_height"] * sy * (0.58 + 0.42 * sy)


def eye_surface(x, y):
    return 0.005 + 0.045 * (1 - (x / P["eye_width"]) ** 2 - (y / P["eye_height"]) ** 2)


def eye_patch(name, center, axes, mat, radius=None, offset=0.0, layer=0.0, iris_shape=False):
    u, v, n = axes
    segments, rings = 96, 12
    vertices = [tuple(center + v * offset + n * (eye_surface(0, offset) + layer))]
    for ring in range(1, rings + 1):
        for j in range(segments):
            angle = math.tau * j / segments
            if radius is None:
                x, y = aperture(angle)
                x, y = x * ring / rings, y * ring / rings
            else:
                c = math.cos(angle) * (0.90 if iris_shape else 1)
                s = math.sin(angle) * (1.15 if iris_shape else 1)
                lo, hi = 0, radius
                for _ in range(20):
                    mid = (lo + hi) / 2
                    if inside_eye(mid * c, offset + mid * s):
                        lo = mid
                    else:
                        hi = mid
                x, y = lo * ring / rings * c, offset + lo * ring / rings * s
            vertices.append(tuple(center + u * x + v * y + n * (eye_surface(x, y) + layer)))
    faces = [(0, 1 + (j + 1) % segments, 1 + j) for j in range(segments)]
    for ring in range(rings - 1):
        for j in range(segments):
            a, b = 1 + ring * segments + j, 1 + ring * segments + (j + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    obj = mesh(name, vertices, faces, [mat])
    assert min(poly.normal.dot(n) for poly in obj.data.polygons) > 0.5
    obj["aperture"] = "Almond-trimmed shallow convex surface inside sculpted skin socket"
    obj["gaze_ready"] = False
    # Keep feature bounds in eye-local XY for the groom's exclusion queries.
    transform = n.to_track_quat("Z", "Y").to_matrix().to_4x4()
    transform.translation = center
    inverse = transform.inverted()
    for vertex in obj.data.vertices:
        vertex.co = inverse @ vertex.co
    obj.matrix_world = transform
    obj.data.update()
    return obj


def color_iris(obj, center, axes):
    u, v, n = axes
    attr = obj.data.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="POINT")
    for vertex in obj.data.vertices:
        p = obj.matrix_world @ vertex.co - center
        x, y = p.dot(u), p.dot(v) + 0.002
        r = min(1, math.hypot(x / 0.90, y / 1.15) / P["iris_radius"])
        angle = math.atan2(y, x)
        brightness = (0.65 + 0.35 * math.sin(math.pi * r)) * (1 - 0.22 * y / P["iris_radius"])
        brightness *= 1 + 0.075 * math.sin(angle * 57 + r * 12) * math.sin(r * math.pi)
        brightness *= 1 - 0.63 * max(0, (r - 0.82) / 0.18) ** 2
        attr.data[vertex.index].color = (0.066 * brightness, 0.023 * brightness, 0.006 * brightness, 1)


def ear(name, center, normal, outer, inner):
    u, v, n = basis(normal)
    vertices, faces, colors = [], [], []
    profiles = [(0.001, -0.082), (0.22, -0.079), (0.48, -0.060), (0.70, -0.033),
                (0.88, -0.009), (0.98, 0.004), (1.02, -0.003), (0.99, -0.026),
                (0.88, -0.073), (0.62, -0.116), (0.25, -0.133), (0.001, -0.136)]
    for radius, depth in profiles:
        for j in range(64):
            angle = j * math.tau / 64
            vertices.append(tuple(Vector(center) + u * (P["ear_width"] * radius * math.cos(angle))
                                  + v * (P["ear_height"] * radius * math.sin(angle)) + n * depth))
    for ring in range(len(profiles) - 1):
        for j in range(64):
            a, b = ring * 64 + j, ring * 64 + (j + 1) % 64
            faces.append((a, b, b + 64, a + 64))
            colors.append(1 if ring < 4 else 0)
    obj = mesh(name, vertices, faces, [outer, inner], colors)
    sub = obj.modifiers.new("Rounded ear cartilage", "SUBSURF")
    sub.levels = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=sub.name)
    return obj


def build_face():
    white = material("Eye warm ivory sclera", (0.79, 0.75, 0.66), 0.20)
    lid = material("Soft anatomical eyelid", (0.47, 0.27, 0.125), 0.70)
    lash = material("Fine warm lid margin", (0.095, 0.039, 0.019), 0.56)
    pupil = material("Black brown pupil", (0.005, 0.0025, 0.0013), 0.12)
    iris_mat = material("Warm brown radial iris", (1, 1, 1), 0.19)
    iris_color = iris_mat.node_tree.nodes.new("ShaderNodeVertexColor")
    iris_color.layer_name = "Color"
    iris_mat.node_tree.links.new(iris_color.outputs["Color"], iris_mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
    ear_outer = material("Ear soft cream", (0.62, 0.385, 0.21), 0.66)
    ear_inner = material("Ear inner warm tan", (0.45, 0.22, 0.115), 0.74)
    nose_mat = material("Nose dark chestnut", (0.076, 0.025, 0.014), 0.40)
    nostril_mat = material("Recessed nostril interior", (0.021, 0.007, 0.003), 0.78)
    mouth_mat = material("Subtle mouth crease", (0.22, 0.104, 0.055), 0.83)
    for sign, side in [(1, "L"), (-1, "R")]:
        center = Vector((sign * P["eye_x"], P["eye_y"], P["eye_z"]))
        axes = basis((sign * 0.28, -0.96, 0.035))
        u, v, n = axes
        eye_patch("Eye_" + side + "_Sclera", center, axes, white)
        iris = eye_patch("Eye_" + side + "_Iris", center, axes, iris_mat, P["iris_radius"], -0.002, 0.0012, True)
        color_iris(iris, center, axes)
        eye_patch("Eye_" + side + "_Pupil", center, axes, pupil, P["pupil_radius"], -0.002, 0.0024)
        for half, start, finish, thick in [("Upper", 0, math.pi, 0.009), ("Lower", math.pi, math.tau, 0.006)]:
            pts = []
            for j in range(33):
                x, y = aperture(start + (finish - start) * j / 32)
                pts.append(center + u * (x * 1.04) + v * (y * 1.035) + n * 0.004)
            tube("Eye_" + side + "_Lid_" + half, pts, thick, lid)
        pts = []
        for j in range(33):
            x, y = aperture(0.08 + (math.pi - 0.16) * j / 32)
            pts.append(center + u * x + v * y + n * (eye_surface(x, y) + 0.002))
        tube("Eye_" + side + "_Lash", pts, 0.004, lash)
        ear("Ear_" + side, (sign * P["ear_x"], P["ear_y"], P["ear_z"]), (sign * 0.62, -0.77, 0.16), ear_outer, ear_inner)
    nose = ellipsoid("Nose", (0, -1.912, 1.192), (0.105, 0.076, 0.078), nose_mat, 64, 48)
    for vertex in nose.data.vertices:
        vertex.co.x *= 0.88 + 0.18 * vertex.co.z / 0.078
    for sign, side in [(1, "L"), (-1, "R")]:
        cutter = ellipsoid("Nostril_Cutter", (sign * 0.052, -1.975, 1.194), (0.022, 0.037, 0.014), None, 32, 20)
        cutter.rotation_euler.y = sign * 0.42
        bpy.context.view_layer.objects.active = nose
        cut = nose.modifiers.new("Inset nostril " + side, "BOOLEAN")
        cut.operation = "DIFFERENCE"
        cut.object = cutter
        bpy.ops.object.modifier_apply(modifier=cut.name)
        bpy.data.objects.remove(cutter, do_unlink=True)
        cavity = ellipsoid("Nostril_" + side, (sign * 0.052, -1.945, 1.194), (0.015, 0.010, 0.007), nostril_mat, 24, 16)
        cavity.rotation_euler.y = sign * 0.42
    def face_surface(x, z):
        z += 0.075
        hit, point, normal, index = bpy.data.objects["Head"].ray_cast(Vector((x, -3, z)), Vector((0, 1, 0)))
        if not hit:
            raise ValueError("Mouth anchor must hit the head surface")
        return (x, point.y - 0.0018, z)
    tube("Mouth_Closed_Smile", [face_surface(x, z) for x, z in [
        (-0.165, 0.974), (-0.12, 0.953), (-0.055, 0.947), (0, 0.958),
        (0.055, 0.947), (0.12, 0.953), (0.165, 0.974)]], 0.0038, mouth_mat)
    tube("Muzzle_Philtrum", [face_surface(0, z) for z in [1.042, 1.012, 0.985, 0.958]], 0.0022, mouth_mat)
    whisker_mat = material("Fine chestnut whiskers", (0.17, 0.074, 0.030), 0.78)
    for sign, side in [(1, "L"), (-1, "R")]:
        for index in range(4):
            anchor = Vector(face_surface(sign * (0.145 + index * 0.012), 1.027 + index * 0.031))
            points = [anchor + Vector((sign * t * (0.25 + index * 0.012), -0.025 * t,
                                       t * (index - 1.2) * 0.025 - t * t * 0.018))
                      for t in [0, 0.3, 0.65, 1]]
            tube("Whisker_" + side + "_" + str(index), points, 0.00085, whisker_mat, [1, 0.85, 0.4, 0.03])
    claw = material("Small natural gray taupe nails", (0.18, 0.155, 0.13), 0.4)
    for sign, side in [(1, "L"), (-1, "R")]:
        for end, y in [("Front", P["front_y"]), ("Hind", P["rear_y"])]:
            for toe in range(4):
                x = sign * P["front_leg_x" if end == "Front" else "rear_leg_x"] * 1.07 + (toe - 1.5) * 0.083
                nail = ellipsoid("Nail_%s_%s_%d" % (end, side, toe + 1), (x, y - 0.385, 0.086), (0.019, 0.048, 0.030), claw, 20, 16)
                for vertex in nail.data.vertices:
                    vertex.co.x *= 0.72 + 0.28 * (vertex.co.y / 0.048 + 1) * 0.5
