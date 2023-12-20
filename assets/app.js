/* jshint esversion: 9 */

//let pal, lights;

const defaults = {
    "type":'sequential',
    "mode": 'spectral',
    "steps":7,
    "bg":'light',
    "colormode": '-',
    "start":'#B62682',
    "end":'#E1f56E'
}; 

document.addEventListener('alpine:init', () => {

    Alpine.store('colors', {
        ...defaults,
        "pal": [],
        "lights":[],
        "deltae": [],
        "monotony": 0,
        set(k,v){
            if (k !==undefined) this[k] = v;
        }
    });

    Alpine.data('g', () => ({
        ...defaults,
        go(k,v) {
            //#Source https://bit.ly/2neWfJ2 
            const 
                stddev = (arr, usePopulation = false) => {
                    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
                    return Math.sqrt(
                    arr.reduce((acc, val) => acc.concat((val - mean) ** 2), []).reduce((acc, val) => acc + val, 0) /
                        (arr.length - (usePopulation ? 0 : 1))
                    );
                },
                colorblindness = (color, blindness) => {
                    const
                        c = chroma(color).rgb(),
                        co = { r: c[0], g: c[1], b: c[2] };
                    if (blindness === '-'){
                        return color;
                    }else{
                        const cb = colorblind.simulate(co, blindness);
                        return chroma(`rgb(${cb.r},${cb.g},${cb.b})`).hex();
                    }
                };
            let 
                o = Alpine.store('colors'),
                pal;
            o.set(k,v);
            if(o.type === 'sequential'){
                if(o.mode==='spectral'){
                    pal = spectral.palette(o.start, o.end, o.steps);
                    pal = chroma.scale(pal).correctLightness().colors(o.steps);
                }else{
                    pal = chroma.scale([o.start, o.end]).mode(o.mode).correctLightness().colors(o.steps);
                }
            }else if ((o.type === 'divergent')){
                const 
                    s = Math.ceil(o.steps / 2),
                    mid = (o.mode === 'spectral') ? spectral.mix(o.start, o.end, 0.5) : chroma.mix(o.start, o.end , 0.5, o.mode),
                    mid_lab = chroma(mid).lab(),
                    avg_l = 0.5*(chroma(o.start).lab()[0] + chroma(o.end).lab()[0]),
                    mid_l = (o.bg === 'light') ? avg_l + 0.8 * (100 - avg_l) : 0.25 * avg_l,
                    mid_new = chroma.lab(mid_l, mid_lab[1], mid_lab[2]).hex(),
                    start_new = chroma(o.start).set('lab.l', avg_l).hex(),
                    end_new = chroma(o.end).set('lab.l', avg_l).hex();
                let
                    p1,
                    p2;
                if(o.mode==='spectral'){
                    p1 = spectral.palette(start_new, mid_new, s);
                    p2 = spectral.palette(mid_new, end_new, s);
                    p1 = chroma.scale(p1).correctLightness().colors(s);
                    p2 = chroma.scale(p2).correctLightness().colors(s);
                }else{
                    p1 = chroma.scale([start_new, mid_new]).mode(o.mode).correctLightness().colors(s);
                    p2 = chroma.scale([mid_new, end_new]).mode(o.mode).correctLightness().colors(s);
                }
                p1.pop();
                pal = p1.concat(p2);
            }else{
                const 
                    s = Math.ceil(o.steps / 2),
                    mid = (o.mode === 'spectral') ? spectral.mix(o.start, o.end, 0.5) : chroma.mix(o.start, o.end , 0.5, o.mode),
                    mid_lab = chroma(mid).lab(),
                    avg_l = 0.5*(chroma(o.start).lab()[0] + chroma(o.end).lab()[0]),
                    mid_l = (o.bg === 'light') ? avg_l + 0.8 * (100 - avg_l) : 0.25 * avg_l,
                    mid_new = chroma.lab(mid_l, 0, 0).hex(),
                    start_new = chroma(o.start).set('lab.l', avg_l).hex(),
                    end_new = chroma(o.end).set('lab.l', avg_l).hex();
                let
                    p1,
                    p2;
                if(o.mode==='spectral'){
                    p1 = spectral.palette(start_new, mid_new, s);
                    p2 = spectral.palette(mid_new, end_new, s);
                }else{
                    p1 = chroma.scale([start_new, mid_new]).mode(o.mode).colors(s);
                    p2 = chroma.scale([mid_new, end_new]).mode(o.mode).colors(s);
                }
                p1.pop();
                pal = p1.concat(p2);
                pal = pal.map((c,i) => {
                    if (i !== 0 && i !== pal.length -1 ){
                        return spectral.mix(c, mid_new, 0.75);
                    }else{
                        return c
                    }
                });
            }

            pal = pal.map(c => colorblindness(c,o.colormode));

            const 
                lights = pal.map(c => chroma(c).lab()[0]),
                deltae = pal.map((c,i) => {
                    if (i == pal.length -1){
                        return -1;
                    }else{
                        return chroma.deltaE(c, pal[i+1]);
                    }
                }).filter(c => c != -1);

            o.pal = pal;
            o.lights = lights;
            o.deltae = deltae.map(d => d.toFixed(2));
            o.monotony = stddev(deltae);
        },
        init() {
            this.$watch('type', v => {this.go('type', v)});
            this.$watch('mode', v => {this.go('mode', v)});
            this.$watch('steps', v => {this.go('steps', v)});
            this.$watch('bg', v => {this.go('bg', v)});
            this.$watch('colormode', v => {this.go('colormode', v)});
            this.$watch('start', v => {this.go('start', v)});
            this.$watch('end', v => {this.go('end', v)});
            this.go();
        }
    }))
});

