const fragWGSL = `

// TODO: Pass in canvas resolutions so we can calculate aspect ratio.
struct FrameInfo {
  frameNumber: u32,
}

@binding(0) @group(0) var mySampler: sampler;
@binding(1) @group(0) var myTexture: texture_2d<f32>;
@binding(2) @group(0) var<uniform> frameInfo : FrameInfo;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
}

struct Triangle {
  // Positions of three vertices (v0, v1, v2).
  positions: array<f32, 3>,
  normal: vec3<f32>,
  color: vec3<f32>,
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

  // Display ray dir as color.
  var out_color = vec4(ray_dir * 0.5 + vec3(0.5), 1.0);
  return out_color;

  // let prevColor = textureSample(myTexture, mySampler, fragUV);
  // return vec4(prevColor.rgb, 1.0);
  // return vec4(fragUV.xy, 1.0, 1.0);
}
`;

export default fragWGSL;