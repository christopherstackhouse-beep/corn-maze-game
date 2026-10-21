"""Deterministic original voiced laugh assets. Run manually, not during deployment."""
from pathlib import Path
import numpy as np
from scipy.io.wavfile import write
from scipy.signal import butter, sosfilt
SR=44100
OUT=Path(__file__).resolve().parents[1]/'dist/audio'
OUT.mkdir(exist_ok=True)
def laugh(name,attack):
    rng=np.random.default_rng(91 if attack else 35)
    count=13 if attack else 6
    pace=.175 if attack else .19
    length=count*pace+.45
    out=np.zeros(int(SR*length))
    for i in range(count):
        dur=pace*1.12; t=np.arange(int(SR*dur))/SR; u=t/dur
        base=(215 if attack else 180)+rng.uniform(-20,30)
        pitch=base+100*np.sin(np.pi*u)-65*u+6*np.sin(2*np.pi*32*t)
        phase=2*np.pi*np.cumsum(pitch)/SR
        voice=np.zeros_like(t)
        # Harmonic glottal source, shaped by broad vowel formants.
        vowel=[(450,150),(1800,260),(2800,350)] if i%3 else [(700,180),(1250,230),(2600,350)]
        for k in range(1,25):
            freq=k*pitch
            weight=.13/k
            for center,width in vowel:weight+=np.exp(-.5*((freq-center)/width)**2)/(k**.5)
            voice+=np.sin(k*phase+.13*k)*weight
        breath=sosfilt(butter(2,[900,6500],btype='bandpass',fs=SR,output='sos'),rng.normal(0,1,len(t)))
        envelope=np.minimum(1,u/.08)*np.maximum(0,1-u)**.65
        syllable=(voice+.20*breath)*envelope
        start=int((.03+i*pace+rng.uniform(0,.014))*SR)
        out[start:start+len(t)]+=syllable[:len(out)-start]
    out=sosfilt(butter(2,110,btype='highpass',fs=SR,output='sos'),out)
    out=np.tanh(out*1.4)
    out*=.89/max(np.max(np.abs(out)),1e-6)
    write(OUT/name,SR,np.int16(out*32767))
    print(name, 'seconds',round(length,2),'peak dBFS',round(20*np.log10(np.max(np.abs(out))),1),'RMS dBFS',round(20*np.log10(np.sqrt(np.mean(out*out))),1))
laugh('lester-giggle.wav',False)
laugh('lester-tickle-cackle.wav',True)
