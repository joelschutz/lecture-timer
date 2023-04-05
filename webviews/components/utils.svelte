<script lang="ts" context="module">
    export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)

    export function toTime(timeInSeconds: number): string {
        if (timeInSeconds < 0) {
            return "--:--:--";
        }
        const hours = Math.floor(timeInSeconds / (60 * 60));
        const pHours = (hours < 10 ? "0" : "") + hours.toString();
        const minutes = Math.floor(timeInSeconds / 60);
        const pMinutes = (minutes < 10 ? "0" : "") + minutes.toString();
        const seconds = Math.floor(timeInSeconds - minutes * 60);
        const pSeconds = (seconds < 10 ? "0" : "") + seconds.toString();

        return pHours + ":" + pMinutes + ":" + pSeconds;
    }

    export interface Stamp {
        time: number;
        line: number;
    }
</script>