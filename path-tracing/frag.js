const fragWGSL = `

const M_PI: f32 = 3.141592653589793238462643;
const SAMPLE_COUNT: u32 = 0;
const TRIANGLE_COUNT: u32 = 30;
const EPSILON: f32 = 0.0001;
const T_MIN: f32 = 0.001;
const T_MAX: f32 = 100.0;

// TODO: Pass in canvas resolutions so we can calculate aspect ratio.
struct FrameInfo {
  frame_number: u32,
}

@binding(0) @group(0) var mySampler: sampler;
@binding(1) @group(0) var myTexture: texture_2d<f32>;
@binding(2) @group(0) var<uniform> frame_info : FrameInfo;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
}

struct Triangle {
  // Positions of three vertices (v0, v1, v2).
  positions: array<vec3<f32>, 3>,
  normal: vec3<f32>,
  color: vec3<f32>,
  emission: vec3<f32>,
}

// TODO: Store hit material info.
struct HitInfo {
  t: f32,
  hit: bool,
  tri: Triangle,
}

fn get_primary_ray_direction(
  x: f32,
  y: f32,
  cam_pos: vec3<f32>,
  left_bottom: vec3<f32>,
  right: vec3<f32>,
  up: vec3<f32>
) -> vec3<f32> {
  let image_plane_pos = left_bottom + x * right + y * up;
  return normalize(image_plane_pos - cam_pos);
}

// Calculate ray-triangle intersection using the Möller-Trumbore algorithm.
// Source: https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
fn ray_triangle_intersection(
  origin: vec3<f32>, 
  dir: vec3<f32>, 
  triangle: Triangle,
) -> HitInfo {
  var hit_info: HitInfo;
  // v1 - v0
  let edge1 = triangle.positions[1] - triangle.positions[0];
  // v2 - v0
  let edge2 = triangle.positions[2] - triangle.positions[0];

  let h = cross(dir, edge2);
  let a = dot(edge1, h);
  if (a > -EPSILON && a < EPSILON) {
    // Ray is parallel to this triangle.
    hit_info.hit = false;
    hit_info.t = 0.0;
    return hit_info;
  }

  let f = 1.0 / a;
  let s = origin - triangle.positions[0];
  let u = f * dot(s, h);
  if (u < 0.0 || u > 1.0) {
    hit_info.hit = false;
    hit_info.t = 0.0;
    return hit_info;
  }

  let q = cross(s, edge1);
  let v = f * dot(dir, q);
  if (v < 0.0 || u + v > 1.0) {
    hit_info.hit = false;
    hit_info.t = 0.0;
    return hit_info;
  }

  // u and v are the barycentric coordinates of the hit point.
  // At this point we can compute t.
  let t = f * dot(edge2, q);
  if (t < T_MIN || t > T_MAX) {
    // Hit point occurred outside of bounds.
    hit_info.hit = false;
    hit_info.t = 0.0;
    return hit_info;
  }

  // Record hit information.
  hit_info.hit = true;
  hit_info.t = t;
  hit_info.tri = triangle;

  return hit_info;
}

fn ray_mesh_intersection(
  origin: vec3<f32>,
  direction: vec3<f32>,
) -> HitInfo {
  // Definition of mesh geometry.
  // SOURCE: https://www.shadertoy.com/view/7dKBD3
  var tris: array<Triangle, TRIANGLE_COUNT>;
  tris[0].positions[0] = vec3(0.000000133, -0.559199989, 0.548799932); tris[0].positions[1] = vec3(0.555999935, -0.559199989, 0.000000040); tris[0].positions[2] = vec3(0.000000133, -0.559199989, 0.000000040); tris[1].positions[0] = vec3(0.313999921, -0.455999970, 0.329999954); tris[1].positions[1] = vec3(0.313999921, -0.455999970, 0.000000040); tris[1].positions[2] = vec3(0.472000152, -0.406000137, 0.000000040); tris[2].positions[0] = vec3(0.000000133, -0.559199989, 0.000000040); tris[2].positions[1] = vec3(0.555999935, -0.559199989, 0.000000040); tris[2].positions[2] = vec3(0.555999935, -0.000000119, 0.000000040); tris[3].positions[0] = vec3(0.264999926, -0.296000093, 0.329999954); tris[3].positions[1] = vec3(0.264999926, -0.296000093, 0.000000040); tris[3].positions[2] = vec3(0.313999921, -0.455999970, 0.000000040); tris[4].positions[0] = vec3(0.423000127, -0.246999890, 0.000000040); tris[4].positions[1] = vec3(0.472000152, -0.406000137, 0.329999954); tris[4].positions[2] = vec3(0.472000152, -0.406000137, 0.000000040); tris[5].positions[0] = vec3(0.264999926, -0.296000093, 0.329999954); tris[5].positions[1] = vec3(0.313999921, -0.455999970, 0.000000040); tris[5].positions[2] = vec3(0.313999921, -0.455999970, 0.329999954); tris[6].positions[0] = vec3(0.313999921, -0.455999970, 0.329999954); tris[6].positions[1] = vec3(0.472000152, -0.406000137, 0.000000040); tris[6].positions[2] = vec3(0.472000152, -0.406000137, 0.329999954); tris[7].positions[0] = vec3(0.240000039, -0.271999955, 0.165000007); tris[7].positions[1] = vec3(0.082000092, -0.225000143, 0.165000007); tris[7].positions[2] = vec3(0.082000092, -0.225000143, 0.000000040); tris[8].positions[0] = vec3(0.240000039, -0.271999955, 0.165000007); tris[8].positions[1] = vec3(0.082000092, -0.225000143, 0.000000040); tris[8].positions[2] = vec3(0.240000039, -0.271999955, 0.000000040); tris[9].positions[0] = vec3(0.290000081, -0.113999903, 0.000000040); tris[9].positions[1] = vec3(0.240000039, -0.271999955, 0.165000007); tris[9].positions[2] = vec3(0.240000039, -0.271999955, 0.000000040); tris[10].positions[0] = vec3(0.082000092, -0.225000143, 0.000000040); tris[10].positions[1] = vec3(0.130000070, -0.064999968, 0.165000007); tris[10].positions[2] = vec3(0.130000070, -0.064999968, 0.000000040); tris[11].positions[0] = vec3(0.082000092, -0.225000143, 0.000000040); tris[11].positions[1] = vec3(0.082000092, -0.225000143, 0.165000007); tris[11].positions[2] = vec3(0.130000070, -0.064999968, 0.165000007); tris[12].positions[0] = vec3(0.000000133, -0.559199989, 0.000000040); tris[12].positions[1] = vec3(0.555999935, -0.000000119, 0.000000040); tris[12].positions[2] = vec3(0.000000133, -0.000000119, 0.000000040); tris[13].positions[0] = vec3(0.130000070, -0.064999968, 0.000000040); tris[13].positions[1] = vec3(0.290000081, -0.114000171, 0.165000007); tris[13].positions[2] = vec3(0.290000081, -0.113999903, 0.000000040); tris[14].positions[0] = vec3(0.290000081, -0.113999903, 0.000000040); tris[14].positions[1] = vec3(0.290000081, -0.114000171, 0.165000007); tris[14].positions[2] = vec3(0.240000039, -0.271999955, 0.165000007); tris[15].positions[0] = vec3(0.130000070, -0.064999968, 0.000000040); tris[15].positions[1] = vec3(0.130000070, -0.064999968, 0.165000007); tris[15].positions[2] = vec3(0.290000081, -0.114000171, 0.165000007); tris[16].positions[0] = vec3(0.000000133, -0.559199989, 0.000000040); tris[16].positions[1] = vec3(0.000000133, -0.000000119, 0.000000040); tris[16].positions[2] = vec3(0.000000133, -0.000000119, 0.548799932); tris[17].positions[0] = vec3(0.130000070, -0.064999968, 0.165000007); tris[17].positions[1] = vec3(0.082000092, -0.225000143, 0.165000007); tris[17].positions[2] = vec3(0.240000039, -0.271999955, 0.165000007); tris[18].positions[0] = vec3(0.130000070, -0.064999968, 0.165000007); tris[18].positions[1] = vec3(0.240000039, -0.271999955, 0.165000007); tris[18].positions[2] = vec3(0.290000081, -0.114000171, 0.165000007); tris[19].positions[0] = vec3(0.423000127, -0.247000158, 0.329999954); tris[19].positions[1] = vec3(0.423000127, -0.246999890, 0.000000040); tris[19].positions[2] = vec3(0.264999926, -0.296000093, 0.000000040); tris[20].positions[0] = vec3(0.423000127, -0.247000158, 0.329999954); tris[20].positions[1] = vec3(0.264999926, -0.296000093, 0.000000040); tris[20].positions[2] = vec3(0.264999926, -0.296000093, 0.329999954); tris[21].positions[0] = vec3(0.423000127, -0.246999890, 0.000000040); tris[21].positions[1] = vec3(0.423000127, -0.247000158, 0.329999954); tris[21].positions[2] = vec3(0.472000152, -0.406000137, 0.329999954); tris[22].positions[0] = vec3(0.555999935, -0.000000119, 0.548799932); tris[22].positions[1] = vec3(0.555999935, -0.000000119, 0.000000040); tris[22].positions[2] = vec3(0.555999935, -0.559199989, 0.000000040); tris[23].positions[0] = vec3(0.000000133, -0.559199989, 0.000000040); tris[23].positions[1] = vec3(0.000000133, -0.000000119, 0.548799932); tris[23].positions[2] = vec3(0.000000133, -0.559199989, 0.548799932); tris[24].positions[0] = vec3(0.000000133, -0.000000119, 0.548799932); tris[24].positions[1] = vec3(0.555999935, -0.559199989, 0.548799932); tris[24].positions[2] = vec3(0.000000133, -0.559199989, 0.548799932); tris[25].positions[0] = vec3(0.000000133, -0.559199989, 0.548799932); tris[25].positions[1] = vec3(0.555999935, -0.559199989, 0.548799932); tris[25].positions[2] = vec3(0.555999935, -0.559199989, 0.000000040); tris[26].positions[0] = vec3(0.472000152, -0.406000137, 0.329999954); tris[26].positions[1] = vec3(0.264999926, -0.296000093, 0.329999954); tris[26].positions[2] = vec3(0.313999921, -0.455999970, 0.329999954); tris[27].positions[0] = vec3(0.555999935, -0.000000119, 0.548799932); tris[27].positions[1] = vec3(0.555999935, -0.559199989, 0.000000040); tris[27].positions[2] = vec3(0.555999935, -0.559199989, 0.548799932); tris[28].positions[0] = vec3(0.472000152, -0.406000137, 0.329999954); tris[28].positions[1] = vec3(0.423000127, -0.247000158, 0.329999954); tris[28].positions[2] = vec3(0.264999926, -0.296000093, 0.329999954); tris[29].positions[0] = vec3(0.000000133, -0.000000119, 0.548799932); tris[29].positions[1] = vec3(0.555999935, -0.000000119, 0.548799932); tris[29].positions[2] = vec3(0.555999935, -0.559199989, 0.548799932);
  tris[0].normal = vec3(0.0, 1.0, 0.0); tris[1].normal = vec3(0.301707575, -0.953400513, 0.0); tris[2].normal = vec3(0.0, 0.0, 1.0); tris[3].normal = vec3(-0.956165759, -0.292825958, -0.0); tris[4].normal = vec3(0.955649049, 0.294507888, 0.0); tris[5].normal = vec3(-0.956165759, -0.292825958, 0.0); tris[6].normal = vec3(0.301707575, -0.953400513, 0.0); tris[7].normal = vec3(-0.285119946, -0.958491845, 0.0); tris[8].normal = vec3(-0.285119946, -0.958491845, -0.0); tris[9].normal = vec3(0.953400053, -0.301709030, 0.0); tris[10].normal = vec3(-0.957826408, 0.287347476, 0.0); tris[11].normal = vec3(-0.957826408, 0.287347476, 0.0); tris[12].normal = vec3(0.0, 0.0, 1.0); tris[13].normal = vec3(0.292825408, 0.956165927, 0.000001554); tris[14].normal = vec3(0.953399906, -0.301709496, -0.000000490); tris[15].normal = vec3(0.292826874, 0.956165478, -0.0); tris[16].normal = vec3(1.0, 0.0, 0.0); tris[17].normal = vec3(0.0, 0.0, 1.0); tris[18].normal = vec3(0.0, 0.0, 1.0); tris[19].normal = vec3(-0.296209850, 0.955122885, 0.000000776); tris[20].normal = vec3(-0.296208371, 0.955123343, 0.0); tris[21].normal = vec3(0.955648909, 0.294508341, 0.000000239); tris[22].normal = vec3(-1.0, 0.0, -0.0); tris[23].normal = vec3(1.0, 0.0, 0.0); tris[24].normal = vec3(0.0, 0.0, -1.0); tris[25].normal = vec3(-0.0, 1.0, 0.0); tris[26].normal = vec3(0.0, 0.0, 1.0); tris[27].normal = vec3(-1.0, -0.0, 0.0); tris[28].normal = vec3(0.0, 0.0, 1.0); tris[29].normal = vec3(0.0, 0.0, -1.0);
  tris[0].color = vec3(0.874000013, 0.874000013, 0.875000000); tris[1].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[2].color = vec3(0.874000013, 0.874000013, 0.875000000); tris[3].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[4].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[5].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[6].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[7].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[8].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[9].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[10].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[11].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[12].color = vec3(0.874000013, 0.874000013, 0.875000000); tris[13].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[14].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[15].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[16].color = vec3(0.289999992, 0.663999975, 0.324999988); tris[17].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[18].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[19].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[20].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[21].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[22].color = vec3(0.730000019, 0.246000007, 0.250999987); tris[23].color = vec3(0.289999992, 0.663999975, 0.324999988); tris[24].color = vec3(0.0, 0.0, 0.0); tris[25].color = vec3(0.874000013, 0.874000013, 0.875000000); tris[26].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[27].color = vec3(0.730000019, 0.246000007, 0.250999987); tris[28].color = vec3(0.839039981, 0.839039981, 0.839999974); tris[29].color = vec3(0.0, 0.0, 0.0);
  tris[0].emission = vec3(0.0, 0.0, 0.0); tris[1].emission = vec3(0.0, 0.0, 0.0); tris[2].emission = vec3(0.0, 0.0, 0.0); tris[3].emission = vec3(0.0, 0.0, 0.0); tris[4].emission = vec3(0.0, 0.0, 0.0); tris[5].emission = vec3(0.0, 0.0, 0.0); tris[6].emission = vec3(0.0, 0.0, 0.0); tris[7].emission = vec3(0.0, 0.0, 0.0); tris[8].emission = vec3(0.0, 0.0, 0.0); tris[9].emission = vec3(0.0, 0.0, 0.0); tris[10].emission = vec3(0.0, 0.0, 0.0); tris[11].emission = vec3(0.0, 0.0, 0.0); tris[12].emission = vec3(0.0, 0.0, 0.0); tris[13].emission = vec3(0.0, 0.0, 0.0); tris[14].emission = vec3(0.0, 0.0, 0.0); tris[15].emission = vec3(0.0, 0.0, 0.0); tris[16].emission = vec3(0.0, 0.0, 0.0); tris[17].emission = vec3(0.0, 0.0, 0.0); tris[18].emission = vec3(0.0, 0.0, 0.0); tris[19].emission = vec3(0.0, 0.0, 0.0); tris[20].emission = vec3(0.0, 0.0, 0.0); tris[21].emission = vec3(0.0, 0.0, 0.0); tris[22].emission = vec3(0.0, 0.0, 0.0); tris[23].emission = vec3(0.0, 0.0, 0.0); tris[24].emission = vec3(3.0, 3.0, 3.0); tris[25].emission = vec3(0.0, 0.0, 0.0); tris[26].emission = vec3(0.0, 0.0, 0.0); tris[27].emission = vec3(0.0, 0.0, 0.0); tris[28].emission = vec3(0.0, 0.0, 0.0); tris[29].emission = vec3(3.0, 3.0, 3.0);

  // Find nearest intersection across all triangles.
  var nearest_hit: HitInfo;
  nearest_hit.t = 1.0e38;
  nearest_hit.hit = false;
  for (var i: u32 = 0; i < TRIANGLE_COUNT; i++) {
    var hit_info = ray_triangle_intersection(origin, direction, tris[i]);
    if (hit_info.hit && hit_info.t < nearest_hit.t) {
      // Hit was closest we've seen so far.
      nearest_hit.t = hit_info.t;
      nearest_hit.hit = true;
      nearest_hit.tri = hit_info.tri;
    }
  }

  return nearest_hit;
}

fn get_random_numbers(
  seed: ptr<function, vec2<u32>>,
) -> vec2<f32> {
  // PCG2D: https://jcgt.org/published/0009/03/02/
  *seed = *seed * 1664525u + 1013904223u;
  (*seed).x += (*seed).y * 1664525u;
  (*seed).y += (*seed).x * 1664525u;
  *seed = *seed ^ vec2((*seed).x >> 16u, (*seed).y >> 16u);
  (*seed).x += (*seed).y * 1664525u;
  (*seed).y += (*seed).x * 1664525u;

  *seed = *seed ^ vec2((*seed).x >> 16u, (*seed).y >> 16u);

  // Convert to float. The constant here is 2^-32.
  return vec2<f32>(*seed) * 2.32830643654e-10;
}

// Given uniform random numbers u_0, u_1 in [0,1)^2, this function returns a
// uniformly distributed point on the unit sphere (i.e. a random direction)
// (omega)
fn sample_sphere(
  random_numbers: vec2<f32>,
) -> vec3<f32> {
  let u0 = random_numbers.x;
  let u1 = random_numbers.y;
  let z = 2.0 * u1 - 1.0;
  let phi = 2.0 * M_PI * u0;
  let x = cos(phi) * sqrt(1.0 - pow(z, 2));
  let y = sin(phi) * sqrt(1.0 - pow(z, 2));

  return vec3(x, y, z);
}

// Like sample_sphere() but only samples the hemisphere where the dot product
// with the given normal (n) is >= 0
fn sample_hemisphere(
  random_numbers: vec2<f32>,
  normal: vec3<f32>,
) -> vec3<f32> {
  let omega = sample_sphere(random_numbers);
  if (dot(normal, omega) < 0.0) {
    return omega - 2.0 * dot(normal, omega) * normal;
  }
  return omega;
}


// Computes the sum of emitted radiance and reflected radiance due to direct
// illumination
// @param point The point being shaded (x)
// @param tri The triangle on which the point is located
// @param seed Needed for get_random_numbers()
// @return A Monte Carlo estimate with N=1 of the direct illumination (L_o(x))
fn compute_direct_illumination(
  point: vec3<f32>,
  tri: Triangle,
  seed: ptr<function, vec2<u32>>,
) -> vec3<f32> {
  var radiance = vec3(0.0);

  // Light being emitted from point.
  let emitted = tri.emission;
  radiance += emitted;

  // Calculate reflected radiance due to direct lighting.
  var reflected = vec3(0.0);
  // Trace random ray in scene.
  let omega = sample_hemisphere(get_random_numbers(seed), tri.normal);
  let reflected_hit = ray_mesh_intersection(point, omega);
  if (reflected_hit.hit) {
    reflected += (tri.color / M_PI) * 2.0 * M_PI * reflected_hit.tri.emission * dot(tri.normal, omega);
  }
  radiance += reflected;

  return radiance;
}


// Finds the triangle intersected by the given ray and performs shading without
// global illumination.
// @param origin The position at which the ray starts
// @param direction The direction vector of the ray
// @param seed Needed for get_random_numbers()
// @return A Monte Carlo estimate of the reflected (direct only) and emitted
//         radiance at the point intersected by the ray (i.e. the color)
fn get_direct_ray_radiance(
  origin: vec3<f32>, 
  direction: vec3<f32>,
  seed: ptr<function, vec2<u32>>
) -> vec3<f32> {
  var hit_info: HitInfo = ray_mesh_intersection(origin, direction);
  if (hit_info.hit) {
    return compute_direct_illumination(origin + hit_info.t * direction, hit_info.tri, seed);
  } else {
    return vec3(0.0);
  }
}


@fragment
fn main(
  @location(0) fragUV: vec2<f32>
) -> @location(0) vec4<f32> {
  // Define camera position and view plane
  const camera_position = vec3(0.278, 0.8, 0.2744);
  const middle = camera_position - vec3(0.0, 0.8, 0.0);
  const up = vec3(0.0, 0.0, -0.56);
  const aspect_ratio = 1.0;
  const right = aspect_ratio * vec3(-0.56, 0.0, 0.0);
  const left_bottom = middle - 0.5 * right - 0.5 * up;

  // Compute the camera ray
  let ray_dir = get_primary_ray_direction(fragUV.x, fragUV.y, camera_position, left_bottom, right, up);

  // Use a different seed for each pixel and each frame.
  let pixel_coord = vec2<u32>(u32(fragUV.x * 8192.0), u32(fragUV.y * 8192.0)); // Not the actual pixel coordinate into the canvas (uses a random scaling factor).
  var seed = pixel_coord ^ vec2<u32>(frame_info.frame_number << 16);
  var out_color: vec3<f32> = vec3(0.0);
  for (var i: u32 = 0; i < SAMPLE_COUNT; i++) {
    out_color += get_direct_ray_radiance(camera_position, ray_dir, &seed);
  }

  // Divide by sample count.
  out_color /= f32(SAMPLE_COUNT);
  return vec4(out_color, 1.0);


  // let prevColor = textureSample(myTexture, mySampler, fragUV);
  // return vec4(prevColor.rgb, 1.0);
  // return vec4(fragUV.xy, 1.0, 1.0);
}
`;

export default fragWGSL;