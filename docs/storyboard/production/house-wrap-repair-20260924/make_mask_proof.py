"""Diagnostic mask illustration only; never used as generated or composited artwork."""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from trusted_reproject import load,save
p=argparse.ArgumentParser();p.add_argument('--input',required=True,type=Path);p.add_argument('--alpha',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args();source=load(a.input);mask=load(a.alpha)[...,0].astype(float)/255
if source.shape[:2]!=mask.shape:raise ValueError('Mask/image dimensions differ')
opacity=.48*mask[...,None];out=np.clip(np.rint(source*(1-opacity)+np.array([30,220,230])*opacity),0,255).astype(np.uint8);save(a.output,out)
sha=lambda x:hashlib.sha256(Path(x).read_bytes()).hexdigest()
a.output.with_suffix('.json').write_text(json.dumps({'purpose':'DIAGNOSTIC ONLY: cyan tint shows mask support/weight, not retouched art. Actual composite uses analytic floating-point alpha, not this quantized visual.','inputSha256':sha(a.input),'alphaSha256':sha(a.alpha),'outputSha256':sha(a.output),'scriptSha256':sha(__file__)},indent=2)+'\n')
