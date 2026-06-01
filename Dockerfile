# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 매니저 캐싱 최적화를 위해 package.json 및 package-lock.json 복사
COPY package*.json ./
RUN npm install

# 소스 코드 전체 복사 후 빌드 (vite config, svelte config 등 포함)
COPY . .
RUN npm run build

# 의존성 정리: 프로덕션용 패키지만 재설치하여 이미지 사이즈 최적화
RUN npm install --omit=dev


# 2. Run Stage
FROM node:20-alpine

WORKDIR /app

# 빌드 스테이지에서 생성된 결과물 복사
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Node 어댑터 환경 변수 설정 (포트 3000)
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# 서버 실행 (node 어댑터 빌드 결과물)
CMD ["node", "build"]
