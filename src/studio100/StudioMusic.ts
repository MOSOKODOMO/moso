// Original, looping music: soft bells, a simple bass line and warm chords.
export class StudioMusic {
  private context?: AudioContext;
  private master?: GainNode;
  private next=0;
  private step=0;
  volume=.25;
  enabled=true;
  unlock(): void {
    if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.connect(this.context.destination);}
    if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
  }
  update(): void {
    const c=this.context,m=this.master;if(!c||!m||c.state!=='running')return;
    m.gain.setTargetAtTime(this.enabled&&!document.hidden?this.volume*.3:0,c.currentTime,.15);
    if(document.hidden||!this.enabled){this.next=c.currentTime;return;}
    if(this.next<c.currentTime)this.next=c.currentTime+.03;
    const melody=[76,79,81,79,76,72,74,0,74,76,79,76,74,71,72,0,72,76,79,84,81,79,76,0,74,77,81,79,77,74,72,0];
    while(this.next<c.currentTime+.15){
      const n=this.step%melody.length,root=[48,43,45,41][Math.floor(n/8)];
      if(melody[n])this.note(melody[n],this.next,.6,.16,'sine');
      if(n%4===0){this.note(root,this.next,1.4,.12,'triangle');[12,16,19].forEach((v,i)=>this.note(root+v,this.next+i*.07,1.2,.035,'sine'));}
      this.next+=.34;this.step++;
    }
  }
  private note(midi:number,start:number,duration:number,volume:number,type:OscillatorType):void {
    const c=this.context!,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=440*2**((midi-69)/12);
    g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume,start+.02);g.gain.exponentialRampToValueAtTime(.0001,start+duration);
    o.connect(g);g.connect(this.master!);o.start(start);o.stop(start+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
}
