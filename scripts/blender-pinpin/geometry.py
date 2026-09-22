"""Small mesh helpers. All geometry is authored here, never imported."""
import math
import bpy
from mathutils import Vector


def material(name, color, roughness=0.5):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def mesh(name, vertices, faces, mats=(), indices=None):
    data = bpy.data.meshes.new(name + "_Mesh")
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    for mat in mats:
        data.materials.append(mat)
    for i, poly in enumerate(data.polygons):
        poly.use_smooth = True
        if indices:
            poly.material_index = indices[i]
    obj["authored"] = True
    return obj


def ellipsoid(name, center, radii, mat=None, segments=40, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = radii
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    obj["authored"] = True
    return obj


def orient(obj, normal):
    obj.rotation_euler = Vector(normal).to_track_quat("Z", "Y").to_euler()
    return obj


def tube(name, points, radius, mat, radii=None):
    curve = bpy.data.curves.new(name + "_Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for index, (bp, point) in enumerate(zip(spline.bezier_points, points)):
        bp.co = point
        if radii is not None:
            bp.radius = radii[index]
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj["authored"] = True
    return obj


def basis(normal):
    normal = Vector(normal).normalized()
    right = normal.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(normal).normalized()
    return right, up, normal


def strand(vertices, faces, indices, root, direction, length, width, bend, bands, sides=7):
    root, direction, bend = Vector(root), Vector(direction).normalized(), Vector(bend)
    axis = Vector((1, 0, 0)) if abs(direction.x) < 0.8 else Vector((0, 1, 0))
    u = direction.cross(axis).normalized()
    v = direction.cross(u).normalized()
    start = len(vertices)
    profiles = [(0, 0.65), (0.20, 1.0), (0.52, 0.78), (0.82, 0.36), (1.0, 0.012)]
    for t, radius in profiles:
        center = root + direction * (length * t) + bend * (t * t)
        for j in range(sides):
            angle = j * math.tau / sides
            vertices.append(tuple(center + width * radius * (math.cos(angle) * u + math.sin(angle) * v)))
    faces.append(tuple(start + j for j in reversed(range(sides))))
    indices.append(bands[0])
    for k in range(len(profiles) - 1):
        for j in range(sides):
            a = start + k * sides + j
            b = start + k * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
            indices.append(bands[k])
    faces.append(tuple(start + 4 * sides + j for j in range(sides)))
    indices.append(bands[-1])
