# Antinude — NSFW Content Blocker

A real-time NSFW content detection system powered by a custom Machine Learning Model (ResNet50) and a Chrome extension. The system is designed to identify and blur inappropriate image content locally in the browser via a high-performance Python FastAPI backend.

---

## Architecture & Networking

The system consists of three main networking layers: the Chrome extension frontend, the NGINX reverse-proxy, and the Dockerized FastAPI model server.

```text
┌──────────────────────┐         HTTPS POST           ┌──────────────────────────┐
│   Chrome Extension   │  ──────────────────────────> │      VPS Server          │
│                      │      /predict                │ ┌──────────────────────┐ │
│  background.js       │      X-API-Key: <key>        │ │ NGINX (Reverse Proxy)│ │
│  - captures tab      │                              │ └───────┬──────────────┘ │
│  - sends screenshot  │  <────────────────────────── │         │ proxy_pass     │
│                      │      { status, conf }        │ ┌───────▼──────────────┐ │
│  content.js          │                              │ │ Docker Container     │ │
│  - applies blur      │                              │ │ (FastAPI + ONNX)     │ │
└──────────────────────┘                              │ └──────────────────────┘ │
                                                      └──────────────────────────┘
```

1. **Frontend**: The Chrome Extension sends active tab screenshots (downscaled JPEG, base64) every 300ms.
2. **Reverse Proxy**: NGINX receives the public HTTPS traffic, handles rate limiting/SSL (via Certbot), and securely forwards the traffic to the internal Docker container.
3. **Backend API**: A Dockerized FastAPI application extracts the image payload, runs preprocessing, and invokes the ONNX `student_model`.

---

## Machine Learning Pipeline

The detection engine uses a robust **Teacher-Student Knowledge Distillation** architecture outlined in `fpfinal.ipynb`.

### 1. The "Teacher" Model (Auto-Labeling)
- We utilize an open-source, pre-trained `nsfw_detector` (trained on >60GB of data, 93% accurate) as the Teacher.
- **Label Mapping**: The teacher predicts 5 categories. We map `porn + hentai + sexy` ➔ **nsfw**, and `neutral + drawings` ➔ **safe**.
- **Dataset Building**: Unlabeled raw images are fed to the Teacher. The teacher outputs a "Soft Label" (a probability score) which directs the image into either a `safe` or `nsfw` dataset, retaining the probability confidence for distillation training.

### 2. The "Student" Model (ResNet50)
- **Architecture**: A lightweight `ResNet50` model pre-trained on ImageNet. All base layers are frozen, except for a custom classification head: `GlobalAveragePooling2D ➔ Dense(256) ➔ Dropout(0.5) ➔ Dense(1, Sigmoid)`.
- **Training Strategy (Knowledge Distillation)**: The student does not just learn binary 0/1 labels. Its loss function combines both the hard label and the teacher's soft probability using a custom α weight (e.g., `0.7 × Hard Loss + 0.3 × Soft Loss`).
- **Augmentation**: Data generation applies Zoom, Horizontal Flip, Rotation, and Brightness adjustments to prevent overfitting.
- **Export**: The trained model is exported to `student_model.onnx` for high-throughput, dependency-light CPU inference in production using `onnxruntime`.

---

## 📡 API Reference

### `POST /predict`
Classify an image as safe or nsfw.

**Headers:**
| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-API-Key` | Required auth key |

**Body:**
```json
{ "image_base64": "<base64-encoded JPEG>" }
```

**Response (200 OK):**
```json
{ "status": "nsfw", "confidence": 0.8765 }
```

---

## Setup & Deployment (VPS & Docker)

We deploy the system onto a Linux VPS using Docker and NGINX for a production-ready environment.

### 1. Build and Run the Docker API
Ensure Docker and Docker Compose are installed, then spin up the backend:
```bash
git clone https://github.com/Ichann-san/antinude.git
cd antinude
docker compose up -d --build
```
*The API will now be listening locally on port 8000.*

### 2. Configure NGINX Reverse Proxy
Create a new NGINX site configuration:
```bash
sudo nano /etc/nginx/sites-available/antinude
```
Paste the proxy configuration:
```nginx
server {
    server_name your-domain.com; # Or VPS IP
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Enable the site and restart NGINX:
```bash
sudo ln -s /etc/nginx/sites-available/antinude /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

---

## Security & Performance Features

- **Protection**: Employs an `X-API-Key` block system preventing unauthorized access to the GPU/CPU inference engine.
- **Rate Limit**: Software limits at 120 reqs/min per IP to prevent DDoS. Payload size is capped at 5MB limit.
- **Frontend Anti-Tampering**: A local browser `MutationObserver` ensures blurs cannot simply be deleted using Chrome Dev Tools.
- **Fast Inference**: Running quantized ONNX on CPU yields <200ms roundtrip inference speeds, maintaining real-time video safety.
