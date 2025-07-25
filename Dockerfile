FROM lukemathwalker/cargo-chef:latest-rust-1 AS chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --recipe-path recipe.json
# Build application
COPY . .
RUN cargo build --release --bin rayspace_rs

# We do not need the Rust toolchain to run the binary!
FROM debian:bookworm-slim AS runtime

# Install OpenSSL and CA certificates
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary
COPY --from=builder /app/target/release/rayspace_rs /usr/local/bin

# Install Node.js and build frontend
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy frontend source and build
COPY --from=builder /app/frontend ./frontend
RUN cd frontend && npm ci && npm run build

# Copy assets directory (keeping for any remaining static files)
COPY --from=builder /app/assets ./assets

ENTRYPOINT ["/usr/local/bin/rayspace_rs"]
