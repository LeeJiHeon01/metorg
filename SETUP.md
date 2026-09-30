# 프로젝트 세팅 안내 (변경사항 통합 관리 MVP)

기획서: [`기획서.md`](./기획서.md)

## 스택
- **백엔드**: Spring Boot 4.1.1 / Java 17 / Gradle (WAR)
- **DB**: MariaDB (JPA + Hibernate, `ddl-auto=update` 로 테이블 자동 생성)
- **AI**: Anthropic Claude (Haiku 기본, 토큰 최소화)
- **프론트**: React 19 + TypeScript + Vite 8 (`frontend/`)

## 백엔드 실행
```powershell
# (선택) DB 접속정보를 환경변수로 덮어쓰기
$env:DB_PASSWORD = "실제_root_비밀번호"
# (선택) Claude API 키
$env:ANTHROPIC_API_KEY = "sk-ant-..."

./gradlew bootRun
```
- 기본 포트: `http://localhost:8080`
- DB 접속정보 기본값은 `src/main/resources/application.properties` 참고. `DB_USERNAME`, `DB_PASSWORD`, `DB_PORT`, `DB_NAME` 환경변수로 덮어쓸 수 있음.
- `createDatabaseIfNotExist=true` 라 스키마(`meeting_organize`)는 접속만 되면 자동 생성됨.

## 프론트 실행
```powershell
cd frontend
npm run dev   # http://localhost:5173  (/api → 8080 프록시)
```
> ⚠️ 현재 설치된 Node 가 `22.11.0` 인데 Vite 8 은 `20.19+ 또는 22.12+` 를 권장합니다.
> 지금은 네이티브 바인딩을 수동 설치해 동작하지만, **Node LTS(22.12+ 또는 24) 로 업그레이드**를 권장합니다.

## REST API
### 기본 CRUD
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET/POST | `/api/users` | 사용자 목록 / 이름만 등록 |
| GET/POST | `/api/projects` | 프로젝트 목록 / 생성 |
| GET/PUT/DELETE | `/api/projects/{id}` | 조회 / 수정 / 삭제 |
| GET/POST | `/api/projects/{projectId}/tasks` | 작업 목록 / 생성 |
| PUT/DELETE | `/api/tasks/{id}` | 작업 수정 / 소프트 삭제 |

### AI 분석 · 변경 관리
| 메서드 | 경로 | 설명 | 키 필요 |
|---|---|---|---|
| POST | `/api/projects/{id}/tasks/import-md` | `.md` 업로드 → Claude 분석 → 작업 트리 생성 (multipart `file`) | ✅ |
| POST | `/api/projects/{id}/tasks/import-tree` | 구조화된 작업 트리 JSON 을 그대로 저장 (AI 초안 확정/테스트) | ⬜ |
| POST | `/api/projects/{id}/change-requests` | 수정내용 → Claude 가 기존 작업 비교 → 자동 반영 + 이력 | ✅ |
| POST | `/api/projects/{id}/change-requests/apply` | 확정된 변경목록 그대로 반영 + 이력 (AI 초안 확정/테스트) | ⬜ |
| GET | `/api/projects/{id}/change-requests` | 수정요청 이력 | ⬜ |
| GET | `/api/projects/{id}/change-history` | 변경 전/후 이력 | ⬜ |

> AI 응답 파싱(`AiJson`) → 계층 저장(`TaskImportService`) → 변경 반영·이력(`ChangeApplyService`) 로직은
> `import-tree` / `change-requests/apply` 경로로 **실제 MariaDB 기준 end-to-end 검증 완료**.
> `import-md` / `change-requests` 는 동일 로직 앞단에 Claude 호출만 붙인 것으로, `ANTHROPIC_API_KEY` 설정 후 사용.

## 구현 완료
- **기본 CRUD**: 사용자·프로젝트·작업 (소프트삭제, 계층 구조)
- **AI 분석 → 작업 자동생성**: MD 업로드/Claude 호출 + JSON 파싱 + 계층 저장
- **수정사항 → 비교 → 반영 → 이력**: ADD/UPDATE/REMOVE 적용 + 변경 전/후 이력 저장·조회
- (검증) `import-tree`, `change-requests/apply` 로 실제 MariaDB end-to-end 통과

## 아직 남은 부분 (다음 단계)
- **Claude 라이브 호출 검증**: `import-md` / `change-requests` 는 `ANTHROPIC_API_KEY` 설정 후 실제 응답 품질 튜닝 필요.
- **프론트 화면**: 프로젝트 목록/생성 데모만 있음. MD 업로드·작업 상세(상태/담당자 변경)·수정사항 입력·변경 이력 화면 미구현.
- **작업 상태/담당자 변경 UI 연동**: API(`PUT /api/tasks/{id}`)는 있으나 화면 없음.

## DB 접속정보
- 로컬에 MariaDB(**3307**)와 MySQL(3306) 두 서버가 실행 중입니다. 이 프로젝트는 **MariaDB 3307** 을 사용합니다.
- 기본값: `root` / `rhdxhd12` / port `3307` / db `meeting_organize`. 필요 시 `DB_*` 환경변수로 덮어쓰기.
