# Anti NSFW

> A real-time NSFW content detection system powered by a custom Machine Learning Model (ResNet50) and a Chrome extension.

## Overview

Antinude is a robust system designed to identify and blur inappropriate image content locally in the browser. It combines a lightweight Chrome extension frontend with a high-performance Python FastAPI backend, leveraging a custom ResNet50 model distilled from a powerful teacher model.

## Features

- **Real-Time Blurring** — Chrome extension continuously captures the active tab and applies local blur to inappropriate content.
- **Frontend Anti-Tampering** — A `MutationObserver` ensures the blurred overlays cannot simply be deleted using Chrome Dev Tools.
- **High-Performance Inference** — Runs quantized ONNX models on CPU, yielding <200ms roundtrip inference speeds to maintain real-time safety.
- **Security & Rate Limiting** — Employs `X-API-Key` authentication and strict software rate limits (120 reqs/min per IP) to prevent DDoS attacks.
- **Knowledge Distillation ML** — Uses a Teacher-Student training pipeline to compress a massive 60GB dataset model into a lightweight, highly accurate ResNet50 student model.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Python (FastAPI) | High-performance backend API |
| ResNet50 & ONNX | Core ML student model and inference engine |
| Chrome Extension (JS) | Frontend background processing and DOM manipulation |
| Docker & Compose | Containerized application environment |
| NGINX | Reverse proxy, SSL handling, and rate limiting |

## Architecture & How It Works

The system operates across three networking layers:

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

### 1. Ingestion via Extension
The Chrome Extension sends active tab screenshots (downscaled JPEG, base64) to the backend every 300ms.

### 2. Reverse Proxy Routing
NGINX receives public HTTPS traffic, handles rate limiting and SSL (via Certbot), and securely forwards the requests to the internal Docker container.

### 3. Machine Learning Pipeline
The FastAPI backend invokes the `student_model.onnx`. This model was trained using Knowledge Distillation:
- **Teacher**: A pre-trained `nsfw_detector` generated "Soft Labels" (probability scores) on raw images.
- **Student**: A `ResNet50` model trained to mimic these soft labels combined with hard labels, ensuring high accuracy while remaining extremely lightweight for CPU inference.

## Getting Started

To deploy the backend locally using Docker:

```bash
git clone https://github.com/Ichann-san/antinude.git
cd antinude
docker compose up -d --build
```
The API will be available at `http://localhost:8000`.

To install the Chrome Extension:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `extension/` directory from the repository.
