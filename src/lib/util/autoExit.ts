export function createAutoExit(
    terminateTime = 5 * 60 * 1000,
    onExit: () => void = () => {
        console.info("Auto-closing due to inactivity");
        process.exit(0);
    }
) {
    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    const cancel = () => {
        if (exitTimer) {
            clearTimeout(exitTimer);
            exitTimer = undefined;
        }
    };

    const update = (timeout = terminateTime) => {
        cancel();

        exitTimer = setTimeout(() => {
            exitTimer = undefined;
            onExit();
        }, timeout);
    };

    update();

    return {
        update,
        cancel,
    };
}
