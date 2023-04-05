import * as vscode from 'vscode';

export interface Stamp{
    time: number
    line: number
}

interface Timer {
    file: vscode.TextDocument
    title: string
    duration?: Number
    startedAt?: Date
    elapsedTime: number // In miliseconds
    isPaused: boolean
    stamps: Stamp[]
}

export class TimerManager {
    files: Timer[]

    constructor() { this.files = [] }
    /**
     * AddTimer
     */
    public AddTimer(data: any): number {
        let stamps: Stamp[] = []
        data.stamps.forEach((stamp: any) => {
            stamps.push({
                time: +stamp.time,
                line: +stamp.line
            })
        });
        return this.files.push({
            title:data.title,
            file: data.file,
            duration: data.duration,
            isPaused: true,
            elapsedTime: 0,
            stamps: stamps
        }) - 1
    }

    /**
     * StartTimer
     */
    public StartTimer(index: number) {
        const f = this.files[index]
        if (f.isPaused) {
            f.startedAt = new Date()
            f.isPaused = false
        }
    }

    /**
     * StopTimer
     */
    public StopTimer(index: number) {
        const f = this.files[index]
        if (!f.isPaused) {
            f.elapsedTime = this.GetTime(index) * 1000
            f.startedAt = undefined
            f.isPaused = true
        }
    }

    /**
     * GetTime
     */
    public GetTime(index: number | undefined): number {
        if (index != undefined) {
            const f = this.files[index]
            let delta = 0
            if (!f.isPaused && f.startedAt) {
                const now = new Date()
                delta = now.getTime() - f.startedAt.getTime()
            }
            return (f.elapsedTime + delta) / 1000

        }
        return 0
    }

    /**
     * SetTime
     */
    public SetTime(index: number, value: number) {
        const f = this.files[index]
        f.elapsedTime = value * 1000
        f.startedAt = new Date()
    }

    /**
     * SetDuration
     */
    public SetDuration(index: number, value: number) {
        const f = this.files[index]
        f.duration = value
    }

    /**
     * AddStamp
     */
    public AddStamp(index: number, value: number, position: number): number {
        const f = this.files[index]
        var stampIndex = 0
        f.stamps.every(stamp => {
            if (stamp.line > position) {
                return false
            }
            stampIndex += 1
            return true
        });
        f.stamps.splice(stampIndex,0,{
            time: value,
            line: position
        })
        return stampIndex
    }

    /**
     * GetStamp
     */
    public GetStamp(index: number, stampIndex: number): Stamp {
        const f = this.files[index]
        return f.stamps[stampIndex]
    }

    /**
     * SetStamp
     */
    public SetStamps(index: number, stamps: Stamp[]){
        const f = this.files[index]
        f.stamps = stamps
    }

    /**
     * IsPaused
     */
    public IsPaused(index: number | undefined): boolean {
        if (index != undefined) {
            const f = this.files[index]
            return f.isPaused

        }
        return true
    }

    /**
     * GetTimer
     */
    public GetTimer(index: number): Timer {
        return this.files[index]
    }
}