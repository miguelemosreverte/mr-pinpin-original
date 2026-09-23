import unittest
import subprocess

import numpy as np

from key import key_raw, FFMPEG, DESPILL


class ColorKeyTests(unittest.TestCase):
    def test_despill_preserves_alpha_and_neutral_warm_colors(self):
        colors=np.array([[[255,255,255,255],[252,235,204,255],[220,180,140,255],
                          [80,45,30,255],[80,180,70,128],[4,248,4,0]]],np.uint8)
        r=subprocess.run([FFMPEG,'-v','error','-f','rawvideo','-pixel_format','rgba',
            '-video_size','6x1','-i','-','-vf',DESPILL,'-frames:v','1',
            '-f','rawvideo','-pix_fmt','rgba','-'],input=colors.tobytes(),capture_output=True,check=True)
        out=np.frombuffer(r.stdout,np.uint8).reshape(colors.shape)
        np.testing.assert_array_equal(out[:,:,:3][:,:4],colors[:,:,:3][:,:4])
        np.testing.assert_array_equal(out[:,:,3],colors[:,:,3])
        self.assertLess(int(out[0,4,1]),int(colors[0,4,1]))

    def apply(self, colors):
        a = np.array(colors, np.uint8)[None, :, :]
        b = np.frombuffer(key_raw(a.tobytes(), len(colors), 1, (4,248,4)), np.uint8)
        return a[0], b.reshape(-1,4)

    def test_white_cream_and_nose_remain_opaque(self):
        a,b = self.apply([(255,255,255),(252,235,204),(220,180,140),(80,45,30)])
        self.assertTrue(np.all(b[:,3] == 255))
        np.testing.assert_array_equal(a,b[:,:3])

    def test_sampled_green_and_border_variation_clear(self):
        _,b = self.apply([(4,248,4),(0,255,0),(1,239,1),(20,251,16)])
        self.assertTrue(np.all(b[:,3] == 0))

    def test_antialiased_color_ramp_has_partial_alpha_without_rgb_painting(self):
        key=np.array([4,248,4]);cream=np.array([252,235,204])
        colors=np.rint(key[None,:]*(1-np.linspace(0,1,64)[:,None])+
                       cream[None,:]*np.linspace(0,1,64)[:,None]).astype(np.uint8)
        a,b=self.apply(colors)
        self.assertEqual(int(b[0,3]),0)
        self.assertEqual(int(b[-1,3]),255)
        self.assertTrue(np.any((b[:,3]>0)&(b[:,3]<255)))
        self.assertTrue(np.all(np.diff(b[:,3].astype(int))>=0))
        np.testing.assert_array_equal(a,b[:,:3])


if __name__ == '__main__':
    unittest.main()
