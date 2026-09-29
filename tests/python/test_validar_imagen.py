"""Executed in the same packaged Python/WebAssembly runtime as the app."""
import os
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image
from validar_imagen import imagen_valida, revisar_imagen

class ImageValidationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = os.path.join(self.directory.name, "photo.png")

    def image(self, size=(400, 300), formato="PNG"):
        with Image.new("RGB", size, "white") as im:
            im.save(self.path, format=formato)
        return self.path

    def test_valid_real_decoders_and_original_function(self):
        self.image()
        report = revisar_imagen(self.path, 200, 200)
        self.assertEqual(report["estado"], "valid")
        self.assertEqual((report["ancho"], report["alto"]), (400, 300))
        self.assertEqual(report["alcance"], "archivo")
        self.assertEqual(report["matriz"], "pendiente-de-calibracion")
        self.assertTrue(imagen_valida(self.path)[0])

    def test_jpeg_uses_actual_format_not_file_extension(self):
        self.image(formato="JPEG")
        self.assertEqual(revisar_imagen(self.path)["formato"], "JPEG")

    def test_size_boundaries_are_inclusive(self):
        for width,height,expected in [(200,200,"valid"),(199,200,"invalid"),(200,199,"invalid")]:
            with self.subTest(width=width,height=height):
                self.image((width,height))
                self.assertEqual(revisar_imagen(self.path,200,200)["estado"],expected)

    def test_unsupported_format(self):
        self.image(formato="GIF")
        self.assertEqual(revisar_imagen(self.path)["estado"], "invalid")

    def test_missing_and_empty(self):
        self.assertEqual(revisar_imagen(self.path)["estado"], "invalid")
        open(self.path,"wb").close()
        self.assertEqual(revisar_imagen(self.path)["estado"], "invalid")

    def test_spoofed_image_and_truncated_pixels(self):
        with open(self.path,"wb") as f:
            f.write(b"not an image")
        self.assertEqual(revisar_imagen(self.path)["estado"], "invalid")
        self.image()
        with open(self.path,"rb") as f:
            data=f.read()
        with open(self.path,"wb") as f:
            f.write(data[:len(data)//2])
        self.assertEqual(revisar_imagen(self.path)["estado"], "invalid")

    def test_resource_bound_rejected_before_opencv_decode(self):
        self.image((2049,200))
        with patch("cv2.imread") as read:
            self.assertEqual(revisar_imagen(self.path)["estado"], "invalid")
            read.assert_not_called()

    def test_opencv_none_is_invalid(self):
        self.image()
        with patch("cv2.imread", return_value=None):
            self.assertEqual(revisar_imagen(self.path)["estado"], "invalid")

    def test_memory_failure_is_technical_error(self):
        self.image()
        with patch("cv2.imread", side_effect=MemoryError):
            self.assertEqual(revisar_imagen(self.path)["estado"], "error")

    def test_invalid_minimum_is_configuration_error(self):
        self.image()
        self.assertEqual(revisar_imagen(self.path, -1, 200)["estado"], "error")

suite=unittest.defaultTestLoader.loadTestsFromTestCase(ImageValidationTests)
result=unittest.TextTestRunner(verbosity=2).run(suite)
if not result.wasSuccessful():
    raise AssertionError("Python image validation failed")
