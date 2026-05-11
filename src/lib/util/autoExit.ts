export function createAutoExit(
    terminateTime = 5 * 60 * 1000,
    onExit: () => void = () => {
        console.info("Auto close because there was no operation for a certain period of time");
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
