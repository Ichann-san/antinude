from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from io import BytesIO
from PIL import Image
import numpy as np
import onnxruntime as ort

app = FastAPI(title="Antinude Backend - Azure")

@app.get("/")
async def root():
    return {"message": "API Antinude is Running (Powered by ONNX)!"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImagePayload(BaseModel):
    image_base64: str

# --- INITIALIZE ONNX MODEL ONCE AT STARTUP ---
# Load model ke RAM saat server baru nyala biar prediksi selanjutnya ngebut
try:
    print("Loading ONNX Model...")
    # onnxruntime otomatis akan membaca file .data jika ada di folder yang sama
    ort_session = ort.InferenceSession("student_model.onnx", providers=["CPUExecutionProvider"])
    input_name = ort_session.get_inputs()[0].name
    print("Model Loaded Successfully!")
except Exception as e:
    print(f"Gagal memuat model: {e}")
# ---------------------------------------------

def preprocess_image(image: Image.Image) -> np.ndarray:
    # 1. Resize ke 224x224 (Standar ResNet50)
    img = image.resize((224, 224))
    img_np = np.array(img, dtype=np.float32) / 255.0
    
    # 2. Normalisasi standar ImageNet
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    img_np = (img_np - mean) / std
    
    # 3. Ubah format dari (Height, Width, Channel) ke (Channel, Height, Width) ala PyTorch
    img_np = np.transpose(img_np, (2, 0, 1))
    
    # 4. Tambahkan dimensi batch di depan -> (1, 3, 224, 224)
    img_np = np.expand_dims(img_np, axis=0)
    return img_np

@app.post("/predict")
async def process_screenshot(payload: ImagePayload):
    try:
        # Decode gambar
        image_bytes = base64.b64decode(payload.image_base64)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        
        # Preprocess
        input_data = preprocess_image(image)
        
        # Inference pakai ONNX
        outputs = ort_session.run(None, {input_name: input_data})
        
        # Ekstrak probabilitas (Sigmoid output)
        score = float(outputs[0][0][0])
        
        # Tentukan status (Threshold 0.5)
        status = "nsfw" if score > 0.5 else "safe"
        
        return {"status": status, "confidence": score}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memproses gambar: {str(e)}")