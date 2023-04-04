
import computeWGSL from './compute.js';
import vertWGSL from './vert.js';
import fragWGSL from './frag.js';


export const main = async () => {
    // Set up canvas and other devices.
    const canvas = document.getElementById('canvas');

    // Initialize WebGPU device and adapter w/ error handling.
    // Source: https://github.com/gpuweb/gpuweb/blob/main/design/ErrorHandling.md
    let adapter = null;
    let device = null;
    const tryEnsureDeviceOnCurrentAdapter = (async () => {
        // If no adapter, get one.
        // If we can't, rejects and the app falls back.
        if (!adapter) {
            // If no adapter, get one.
            adapter = await navigator.gpu.requestAdapter();
            // If requestAdapter resolves to null, no matching adapter is available.
            // Exit to fallback.
            if (!adapter) return;
        }

        // Try to get a device.
        //   rejection => options were invalid (app programming error)
        device = await adapter.requestDevice();

        // When the device is lost, just try to get a device again.
        device.lost.then((info) => {
            console.error("Device was lost.", info);
            initWebGPU();
        });
    });

    const initWebGPU = (async () => {
        device = null;

        // Keep current adapter (but make a new one if there isn't a current one)
        await tryEnsureDeviceOnCurrentAdapter();
        if (!adapter) return false;
        // If the device is null, the adapter was lost. Try a new adapter.
        // Continue doing this until one is found or an error is thrown.
        while (!device) {
            adapter = null;
            await tryEnsureDeviceOnCurrentAdapter();
            if (!adapter) return false;
        }

        console.log(`maxComputeInvocationsPerWorkgroup: 
            ${device.limits.maxComputeInvocationsPerWorkgroup}`);
        console.log(`maxComputeWorkgroupsPerDimension:
            ${device.limits.maxComputeWorkgroupsPerDimension}`);
        return true;
    });

    const initSuccess = await initWebGPU();
    if (!initSuccess) {
        alert("Failed to initialize WebGPU!");
        return;
    }

    const context = canvas.getContext('webgpu');
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: device,
        format: presentationFormat,
        // Specify we want both RENDER_ATTACHMENT and COPY_SRC since we will copy out of swapchain attachment
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        alphaMode: 'opaque',
    });

    // Set up shaders and pipelines.
    // const computePipeline = device.createComputePipeline({
    //     layout: 'auto',
    //     compute: {
    //         module: device.createShaderModule({
    //             code: computeWGSL,
    //         }),
    //         entryPoint: 'main',
    //     }
    // })

    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                // Sampler binding
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {},
            },
            {
                // Texture binding
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {},
            },
            {
                // Frame info
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {},
            },
        ],
    });

    const fullscreenQuadPipeline = device.createRenderPipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
        vertex: {
            module: device.createShaderModule({
                code: vertWGSL,
            }),
            entryPoint: 'main',
        },
        fragment: {
            module: device.createShaderModule({
                code: fragWGSL,
            }),
            entryPoint: 'main',
            targets: [
                { format: presentationFormat },
            ],
        },
        primitive: {
            topology: 'triangle-list',
        },
    });


    // We will copy the frame's rendering results into this texture and sample it next frame.
    const outputTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: presentationFormat,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
    });


    const uniformBuffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformBindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: sampler,
            },
            {
                binding: 1,
                resource: outputTexture.createView(),
            },
            {
                binding: 2,
                resource: {buffer: uniformBuffer},
            }
        ],
    });

    const renderPassDescriptor = {
        colorAttachments: [
            {
                view: undefined, // Assigned later
                clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
    }

    // Variables for performance measurement (fps)
    var updatePerformance = true;
    var currentTime, previousTime;
    currentTime = previousTime = performance.now();
    var totalFramePerSecond = 0;
    var frameCounter = 0;
    let t = 0;
    function frame() {
        // Write frame info to uniform buffer.
        const frameInfo = new Int32Array(1);
        frameInfo.set([t], 0);
        device.queue.writeBuffer(
            uniformBuffer,
            0,
            frameInfo, // Uniform buffer data
            0,
            1 // Size of uniform buffer
        );

        const commandEncoder = device.createCommandEncoder();


        const swapChainTexture = context.getCurrentTexture();
        renderPassDescriptor.colorAttachments[0].view = swapChainTexture.createView();

        // RENDER PASS
        {
            const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
            renderPass.setPipeline(fullscreenQuadPipeline);
            renderPass.setBindGroup(0, uniformBindGroup);
            renderPass.draw(6, 1, 0, 0);
            renderPass.end();
        }

        // Copy the rendering results from the swapchain into |cubeTexture|.
        commandEncoder.copyTextureToTexture(
            {
                texture: swapChainTexture,
            },
            {
                texture: outputTexture,
            },
            [canvas.width, canvas.height],
        );


        // SUBMIT COMMANDS
        device.queue.submit([commandEncoder.finish()]);

        ++t; // Update time.
        // Measure performance
        // Credit: CSE 113 HW 5
        currentTime = performance.now();
        var elapsedTime = currentTime - previousTime;
        previousTime = currentTime;
        var framePerSecond = Math.round(1 / (elapsedTime / 1000));
        totalFramePerSecond += framePerSecond;
        frameCounter++;

        if (updatePerformance) {
            updatePerformance = false;

            let averageFramePerSecond = Math.round(totalFramePerSecond / frameCounter);

            frameCounter = 0;
            totalFramePerSecond = 0;

            document.getElementById("fps").innerHTML = `FPS:  ${averageFramePerSecond}`;

            setTimeout(() => {
                updatePerformance = true;
            }, 50); // update FPS every 50ms
        }

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

main();