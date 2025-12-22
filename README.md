# Artis
Artis is a social platform tailored for photographers, models, and other visual artists to share work, collaborate, and connect.

## Deployment (Sliplane)
The project includes a multi-stage Dockerfile optimized for Sliplane. It builds the Vite app and serves the static bundle using `serve`.

1. Build the production image:
   ```bash
   docker build -t artis:latest .
   ```
2. Run the container locally to verify:
   ```bash
   docker run --rm -p 4173:4173 artis:latest
   ```
3. Configure Sliplane to deploy the built image. The container listens on port `4173` by default; set the `PORT` environment variable in Sliplane to change it if needed.
