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
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device: device,
        format: presentationFormat,
        alphaMode: 'opaque',
    });

    // Set up shaders and pipelines.
    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: device.createShaderModule({
                code: computeWGSL,
            }),
            entryPoint: 'main',
        }
    })
    const fullscreenQuadPipeline = device.createRenderPipeline({
        layout: 'auto',
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


    // Variables for performance measurement (fps)
    var updatePerformance = true;
    var currentTime, previousTime;
    currentTime = previousTime = performance.now();
    var totalFramePerSecond = 0;
    var frameCounter = 0;
    let t = 0;
    function frame() {
        const commandEncoder = device.createCommandEncoder();

        // COMPUTE PASS
        {
            const computePass = commandEncoder.beginComputePass();
            computePass.setPipeline(computePipeline);
            // TODO: Dynamically set these values instead of hard coding.
            // computePass.dispatchWorkgroups(1);
            // computePass.dispatchWorkgroups(
            //     // Devide # of pixels in canas by workgroup size.
            //     Math.ceil(1),
            //     Math.ceil(1)
            // );
            computePass.end();
        }

        // RENDER PASS
        {
            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: context.getCurrentTexture().createView(),
                        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
            });
            renderPass.setPipeline(fullscreenQuadPipeline);
            renderPass.draw(3, 1, 0, 0);
            renderPass.end();
        }

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