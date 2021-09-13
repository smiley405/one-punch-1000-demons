/**
 * SoundBox API to be used for this game.
 * The game muisc is created using musicEditor: https://xem.github.io/miniOrchestra/
 * And, all other sound-FX are generated from https://xem.github.io/MiniSoundEditor/ 
 */
export var SoundBox = {
    isMusicPlaying: false,
    t: function(i,n) {
        return (n-i)/n;
    },
    init: function() {
        this.A = new AudioContext();
        this.G = this.A.createGain();
        return this;
    },

    play: function(name) {
        var soundFx = null;
        switch(name) {
            case "fxPistol":
                soundFx = this._fxPistol.bind(this);
                break;
            case "fxTele":
                soundFx = this._fxTele.bind(this);
                break;
            case "fxSpawnD":
                soundFx = this._fxSpawnD.bind(this);
                break;
            case "fxSuperT":
                soundFx = this._fxSuperT.bind(this);
                break;
            default:
            case "fxPunch":
                soundFx = this._fxPunch.bind(this);
                break;
        }
        if (!soundFx) { return; }
        var volume = name === "fxPunch" ? 0.2 : 0.5;
        this._audio(soundFx, volume);
    },

    music: function() {
        if (this.isMusicPlaying) { return; }
        this._a([[9,14],[4,14],[16,14],[1,14],[3,6],[6,14],[10,16],[12,14],[8,7],[14,14],[13,9],[15,9],[2,9],[5,9],[7,9],[11,9],[2,21],[3,21],[4,21],[5,21],[6,21],[11,21],[12,21],[13,21],[14,21],[15,21],[16,21],[0,6]],400,.19,.18,.005,.2,.1,'sawtooth');
        this._startMusic();
    },

    _audio: function(soundFx, volume) {
        this.G.gain.value = volume || 1;
        this.G.connect(this.A.destination);
        this.m = this.A.createBuffer(1,96e3,48e3);
        this.b = this.m.getChannelData(0);
        for(var i = 96e3; i--;)this.b[i] = soundFx(i);
        this.s = this.A.createBufferSource();
        this.s.buffer = this.m;
        this.s.connect(this.G);
        this.s.start();
    },

    _fxPunch: function(i) {
        var n=2e4;
        if (i > n) return null;
        var q = this.t(i,n);
        return (Math.pow(i*30,0.3)&33)?q:-q;
    },

    _fxPistol: function(i) {
        var n = 2e4;
        if (i > n) return null;
        var q = this.t(i,n);
        return (Math.pow(i*500000,0.3)&33)?q:-q;
    },

    _fxTele: function(i) {
        var n = 2e4;
        if (i > n) return null;
        var q = this.t(i,n);
        i = i*0.7;
        return (Math.pow(i*50,0.8)&133)?q:-q;
    },

    _fxSpawnD: function(i) {
        var n=1.3e4;
        var c=n/3;
        if (i > n) return null;
        var q=Math.pow(this.t(i,n),3.1);
        return (Math.pow(i,1.08)&(i<c?98:99))?q:-q;
    },

    _fxSuperT: function(i) {
        var n = 25000;
        if (i > n) return null;
        return ((((i^(i>>3))^(i*i*7.3)^(i<<4))&65535)/65536)*this.t(i,n);
    },

    _startMusic: function() {
        setTimeout( function() {
            this.music();
        }.bind(this), 3.39*1000);
    },

    _a: function(notes,center,duration,decaystart,decayduration,interval,volume,waveform,i) {
        var A=new AudioContext;
        var G=A.createGain();
        notes.forEach(function(note){
            var O = A.createOscillator();
            if ( O ){
                O.connect(G);
                G.connect(A.destination);
                O.start(note[0]*interval);
                O.frequency.setValueAtTime(center*1.06**(13-note[1]),note[0]*interval);
                O.type=waveform;
                G.gain.setValueAtTime(volume,note[0]*interval);
                G.gain.setTargetAtTime(1e-5,note[0]*interval+decaystart,decayduration);
                O.stop(note[0]*interval+duration);
            }
        }.bind(this));
    }
}
