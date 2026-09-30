# ===== 1) 프론트엔드 빌드 =====
FROM node:22-alpine AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ===== 2) 백엔드 빌드 (프론트 결과물을 static 으로 번들) =====
FROM eclipse-temurin:17-jdk AS backend
WORKDIR /app
COPY . .
# 프론트 빌드 산출물을 Spring 정적 리소스로 복사 → 단일 서비스로 서빙
COPY --from=frontend /fe/dist ./src/main/resources/static
RUN chmod +x gradlew && ./gradlew bootWar -x test --no-daemon

# ===== 3) 실행 =====
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=backend /app/build/libs/*.war app.war
EXPOSE 8080
# Render 가 주입하는 PORT 로 바인딩 (없으면 8080)
CMD ["sh", "-c", "java -jar app.war --server.port=${PORT:-8080}"]
