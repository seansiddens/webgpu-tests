const fragWGSL = `
@binding(0) @group(0) var mySampler: sampler;
@binding(1) @group(0) var myTexture: texture_2d<f32>;
// @binding(2) @group(0) var<uniform> frameNumber: 

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
}

@fragment
fn main(
  @location(0) fragUV : vec2<f32>
) -> @location(0) vec4<f32> {
  var prevColor = textureSample(myTexture, mySampler, fragUV);
  // prevColor += 0.01;
  return vec4(prevColor.rgb, 1.0);
}
`;

export default fragWGSL;