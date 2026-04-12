from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from io import BytesIO
from PIL import Image
import numpy as np
# import tensorflow as tf  # Uncomment jika pakai Keras/TF nanti

app = FastAPI(title="Strokeguard NSFW Backend - Azure")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImagePayload(BaseModel):
    image_base64: str

# Placeholder model
# model = tf.keras.models.load_model('model.h5')

def predict_image(image: Image.Image) -> str:
    try:
        img_resized = image.resize((224, 224))
        img_array = np.array(img_resized) / 255.0
        img_array = np.expand_dims(img_array, axis=0)

        # Logika model nanti taruh sini
        return "nsfw" 
        
    except Exception as e:
        print(f"Error prediksi: {e}")
        return "safe"

@app.post("/predict")
async def process_screenshot(payload: ImagePayload):
    try:
        image_bytes = base64.b64decode(payload.image_base64)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        
        status = predict_image(image)
        return {"status": status}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memproses gambar: {str(e)}")

# Perhatikan: Tidak ada blok uvicorn.run() atau Ngrok di bawah sini.
# Azure akan menjalankan server ini menggunakan Gunicorn secara otomatis.