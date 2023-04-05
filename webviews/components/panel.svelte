<script lang="ts">
    import { onMount } from "svelte";
    import { backArrow, nextArrow, play, pause, stop } from "./icons.svelte";
    import { Stamp, toTime, clamp } from "./utils.svelte";
    const vscode = acquireVsCodeApi();

    let timerIndex = -1;
    let file = "";
    let title = "No Title";
    let duration = -1;
    let currentTime = -1;
    let stamps: Stamp[] = [];
    let stampIndex = -1;
    let isPaused = true;

    const reset = (full: boolean) => {
        timerIndex = -1;
        title = "No Title";
        duration = -1;
        stamps = [];
        stampIndex = -1;
        if (full) {
            currentTime = -1;
            file = "";
            isPaused = true;
        }
    };

    async function seekUpdate() {
        const sleep = async (ms: number) => {
            return new Promise((resolve) => setTimeout(resolve, ms));
        };
        while (file == "") {
            if (!isPaused) {
                vscode.postMessage({
                    type: "onRefresh",
                    index: timerIndex,
                });
            }
            await sleep(200);
        }
        while (file != "") {
            if (!isPaused) {
                vscode.postMessage({
                    type: "onTimeUpdate",
                    value: currentTime,
                    index: timerIndex,
                });
            }
            await sleep(200);
        }
    }

    $: {
        vscode.postMessage({
            type: isPaused ? "onPause" : "onPlay",
            index: timerIndex,
        });
    }

    function togglePlayState() {
        isPaused = !isPaused;
    }

    function stopTimer() {
        if (!isPaused) {
            togglePlayState();
        }
        if (duration < 0) {
            updateDuration(currentTime);
        }
        updateCurrentTime(0);
    }

    function updateCurrentTime(newValue: number, notify: boolean = true) {
        let max = duration;
        if (max < 0) {
            max = Infinity;
        }
        newValue = clamp(newValue, 0, max);
        if (newValue >= max && !isPaused) {
            stopTimer();
        }
        if (notify) {
            vscode.postMessage({
                type: "onTimeUpdate",
                value: newValue,
                index: timerIndex,
            });
        }
        currentTime = newValue;
    }

    function updateDuration(newValue: number) {
        vscode.postMessage({
            type: "onDurationUpdate",
            value: newValue,
            index: timerIndex,
        });
        duration = newValue;
    }

    function updateStampSelect(newValue: number) {
        newValue = clamp(newValue, 0, stamps.length - 1);
        vscode.postMessage({
            type: "onStampSelect",
            value: newValue,
            index: timerIndex,
        });
        stampIndex = newValue;
        updateCurrentTime(stamps[stampIndex].time);
    }

    onMount(async () => {
        reset(true);
        window.addEventListener("message", async (event) => {
            switch (event.data.type) {
                case "reset": {
                    console.log(event.data.value)
                    reset(event.data.value);
                    break;
                }
                case "file": {
                    file = event.data.value;
                    seekUpdate();
                    break;
                }
                case "title": {
                    title = event.data.value ? event.data.value : "No Title";
                    break;
                }
                case "index": {
                    timerIndex = event.data.value;
                    break;
                }
                case "current": {
                    console.log(event.data.value);
                    updateCurrentTime(event.data.value, false);
                    break;
                }
                case "duration": {
                    if (event.data.value) {
                        duration = event.data.value;
                    }
                    break;
                }
                case "playState": {
                    isPaused = event.data.value;
                    break;
                }
                case "stamps": {
                    stamps = event.data.value;
                    break;
                }
            }
        });
    });
</script>

<h2>{title}</h2>

<p style="width: 100%;">{toTime(currentTime)} / {toTime(duration)}</p>

<audio
    src={file}
    on:loadedmetadata={() => {
        updateDuration(duration);
    }}
    bind:paused={isPaused}
    bind:duration
    bind:currentTime
/>

<div class="grid-container-3-1">
    <button on:click={togglePlayState}>
        {#if isPaused}{@html play}{:else}{@html pause}{/if}
    </button>
    <button on:click={stopTimer}>
        {@html stop}
    </button>
</div>

<input
    type="range"
    bind:value={currentTime}
    on:change={() => {
        updateCurrentTime(currentTime);
    }}
    max={duration}
/>

<div class="grid-container-4">
    <button
        on:click={() => {
            updateCurrentTime(currentTime - 60);
        }}
    >
        &lt&lt
    </button>
    <button
        on:click={() => {
            updateCurrentTime(currentTime - 10);
        }}
    >
        &lt
    </button>
    <button
        on:click={() => {
            updateCurrentTime(currentTime + 10);
        }}
    >
        &gt
    </button>
    <button
        on:click={() => {
            updateCurrentTime(currentTime + 60);
        }}
    >
        &gt&gt
    </button>
</div>
<br />
<hr />

<h3>Time Stamps</h3>

<select class="select-container" size="5">
    {#each stamps as stamp, i}
        <option
            selected={stampIndex == i}
            on:click={() => {
                updateStampSelect(i);
            }}
            value={i}
        >
            line: {stamp.line + 1} @ {toTime(stamp.time)}
        </option>
    {/each}
</select>

<div class="grid-container-2">
    <button
        on:click={() => {
            updateStampSelect(stampIndex - 1);
        }}
    >
        {@html backArrow}
    </button>
    <button
        on:click={() => {
            updateStampSelect(stampIndex + 1);
        }}
    >
        {@html nextArrow}
    </button>
</div>

<style>
    .grid-container-3-1 {
        display: grid;
        grid-template-columns: 3fr 1fr;
        grid-gap: 8px;
    }
    .grid-container-4 {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-gap: 8px;
    }
    .grid-container-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-gap: 8px;
    }
    .select-container {
        width: 100%;
        background: var(--vscode-background);
        color: var(--vscode-button-foreground);
        border: 1px solid var(--vscode-button-border, transparent);
    }

    input[type="range"] {
        height: 32px;
        -webkit-appearance: none;
        margin: 10px 0;
        width: 100%;
    }
    input[type="range"]:focus {
        outline: none;
    }
    input[type="range"]::-webkit-slider-runnable-track {
        width: 100%;
        height: 5px;
        cursor: pointer;
        box-shadow: 0px 0px 0px #000000;
        background: var(--vscode-button-border);
        border-radius: 1px;
        border: 0px solid #000000;
    }
    input[type="range"]::-webkit-slider-thumb {
        box-shadow: 0px 0px 0px #000000;
        border: 1px solid var(--vscode-button-border);
        height: 30px;
        width: 7px;
        border-radius: 5px;
        background: #000000;
        cursor: pointer;
        -webkit-appearance: none;
        margin-top: -12.5px;
    }
    input[type="range"]:focus::-webkit-slider-runnable-track {
        background: var(--vscode-button-border);
    }
    input[type="range"]::-moz-range-track {
        width: 100%;
        height: 5px;
        cursor: pointer;
        box-shadow: 0px 0px 0px #000000;
        background: var(--vscode-button-border);
        border-radius: 1px;
        border: 0px solid #000000;
    }
    input[type="range"]::-moz-range-thumb {
        box-shadow: 0px 0px 0px #000000;
        border: 1px solid var(--vscode-button-border);
        height: 30px;
        width: 7px;
        border-radius: 5px;
        background: #000000;
        cursor: pointer;
    }
    input[type="range"]::-ms-track {
        width: 100%;
        height: 5px;
        cursor: pointer;
        background: transparent;
        border-color: transparent;
        color: transparent;
    }
    input[type="range"]::-ms-fill-lower {
        background: var(--vscode-button-border);
        border: 0px solid #000000;
        border-radius: 2px;
        box-shadow: 0px 0px 0px #000000;
    }
    input[type="range"]::-ms-fill-upper {
        background: var(--vscode-button-border);
        border: 0px solid #000000;
        border-radius: 2px;
        box-shadow: 0px 0px 0px #000000;
    }
    input[type="range"]::-ms-thumb {
        margin-top: 1px;
        box-shadow: 0px 0px 0px #000000;
        border: 1px solid var(--vscode-button-border);
        height: 30px;
        width: 7px;
        border-radius: 5px;
        background: #000000;
        cursor: pointer;
    }
    input[type="range"]:focus::-ms-fill-lower {
        background: var(--vscode-button-border);
    }
    input[type="range"]:focus::-ms-fill-upper {
        background: var(--vscode-button-border);
    }
</style>
