export const main = async () => {


    // Variables for performance measurement (fps)
    var updatePerformance = true;
    var currentTime, previousTime;
    currentTime = previousTime = performance.now();
    var totalFramePerSecond = 0;
    var frameCounter = 0;
    let t = 0;
    function loop() {

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

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

main();