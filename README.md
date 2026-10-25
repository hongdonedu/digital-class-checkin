# 디지털 수업 데이터 체크인

> 오늘의 나를 데이터로 남기자 — 수업 시작 1분 체크인, 수업 끝 1분 체크아웃.
> 1~6학년 디지털·AI 도구 활용 수업(바이브코딩·캔바·AI 도구·태블릿 앱 등)의 데이터리터러시 연구회용 정적 웹앱입니다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 학생 페이지 (태블릿·스마트폰). 체크인/체크아웃 설문 |
| `dashboard.html` | 선생님 대시보드 (PC·프로젝터). 학년 비교, 우리 반 지금 보기, CSV |
| `teacher.html` | 선생님 메뉴. 학급별 QR 생성(체크인·시간표 설문), 링크, PIN 보호 |
| `survey.html` | 시간표 설문 「우리 반 시간표, 내가 짠다면」 (3~6학년, 1회 2분). `?g=&c=` 로 학년·반 고정 |
| `config.js` | 설정 (구글 시트 연결 주소, 학교명, PIN) |
| `common.js` / `shared.css` | 공통 로직·스타일 (수정 불필요) |
| `apps-script/Code.gs` | 구글 시트에 붙일 Apps Script |
| `assets/hero.webp`, `assets/mascot.webp` | (선택) 타이틀 그림·마스코트. 없으면 CSS 그림이 대신 나옵니다 |

**연결 전에도 바로 써 볼 수 있습니다.** `config.js` 의 `SCRIPT_URL` 이 비어 있으면 "미리보기 모드"로 동작합니다. 학생 페이지는 이 기기(브라우저)에만 저장하고, 대시보드는 "예시 데이터"라고 표시된 가상 데이터를 보여 줍니다. 내일 연구회 시연은 이 상태로도 가능합니다.

---

## (a) 구글 시트 + Apps Script 연결

1. 시트는 이미 만들어 두었습니다(`data` 탭 + 헤더 22열, 시간대 Asia/Seoul):
   **「디지털 수업 데이터 체크인 (2026 데이터리터러시 연구회)」**
   https://docs.google.com/spreadsheets/d/1tYm8VV20O-H5CW8AKLQ4paZ69sfyJFqh1yJgt1QPlGM/edit
   (새로 만들고 싶으면 새 스프레드시트를 만들어도 됩니다. `setup` 실행이 탭·헤더를 만들어 줍니다.)
2. 그 시트에서 메뉴 **확장 프로그램 → Apps Script** 를 엽니다.
3. 편집기에 있는 내용을 모두 지우고 `apps-script/Code.gs` 내용을 **그대로 붙여 넣고** 저장(Ctrl+S)합니다.
4. 상단 함수 선택에서 `setup` 을 고르고 **실행** → 권한 검토 → 내 계정 선택 → "고급" → "…(안전하지 않음)으로 이동" → 허용.
   시트에 `data` 탭과 헤더 22개 열이 생기면 성공입니다.
5. 오른쪽 위 **배포 → 새 배포** → 톱니 ⚙ 에서 유형 **웹 앱** 선택.
   - 설명: `v1`
   - 실행: **나**
   - 액세스 권한: **모든 사용자**
6. **배포** → 웹 앱 URL(`https://script.google.com/macros/s/…/exec`) **복사**.
7. `config.js` 를 열어 `SCRIPT_URL: ""` 의 따옴표 안에 붙여 넣습니다.
   ```js
   SCRIPT_URL: "https://script.google.com/macros/s/AKfy…/exec",
   ```
8. 각 html 파일의 `<script src="config.js?v=1">` 에서 숫자를 **`v=2`** 로 올립니다 (브라우저 캐시 때문). 이후 config.js 를 바꿀 때마다 숫자를 하나씩 올립니다.

> Code.gs 를 수정한 뒤에는 **배포 → 배포 관리 → ✎ → 버전: 새 버전 → 배포** 를 눌러야 반영됩니다 (URL 은 그대로).

### 헤더 순서 (시트 `data` 탭)

```
ts, date, weekday, period, grade, cls, num, phase,
mood, energy, screen_yday, use_yday, expect, confidence_pre,
tool, fun, difficulty, help, confidence_post, best, note, device_id
```

- 수업 전(`phase=before`) 행에는 `mood~confidence_pre` 가, 수업 후(`after`) 행에는 `tool~note` 가 채워지고 나머지는 빈칸입니다.
- `screen_yday` 0~4 = 안 썼어 / 1시간보다 적게 / 1~2시간 / 2~3시간 / 3시간 이상
- `use_yday` 는 복수 선택을 `;` 로 이어 저장 (예: `게임;영상(유튜브 등)`)
- `difficulty` 5 = 아주 어려웠어, `help` 5 = 혼자 다 했어
- `device_id` 는 브라우저마다 생성되는 무작위 값입니다 (중복 방지용, 이름·개인정보 아님).

### 시간표 설문 (`survey` 탭)

`survey.html` 응답은 같은 시트의 **`survey` 탭**에 쌓입니다 (Code.gs 가 POST 의 `sheet:"survey"` 를 보고 탭을 나눕니다. `setup` 을 실행하면 두 탭이 함께 만들어집니다).

```
ts, date, grade, cls, num, focus_best, focus_worst, worst_why, p1_subject, p1_why,
last_subject, after_lunch_subject, science_pref, two_in_row, wish, device_id
```

대시보드 맨 아래 "시간표 설문" 패널에서 1교시 희망 과목(학년별 누적) 옆에 **부산 실제 시간표**(NEIS 시간표 분석, 3~6학년 1반 1주 기준: 과목이 1·2교시에 놓인 비율 — 국어 59%, 영어 49%, 수학 42%, 체육 41%, 과학 37%, 도덕 28%, 음악 22%, 사회 21%, 미술 17%, 실과 15%, 과학 2교시 연속 블록 9%) 비교표가 함께 나옵니다. 수치를 고치려면 `common.js` 의 `BUSAN_P12`, `BUSAN_SCIENCE_BLOCK` 을 수정하세요. 설문 CSV 는 대시보드 "설문 CSV 내려받기" 버튼으로 받습니다.

---

## (b) GitHub Pages 올리기

1. github.com (계정 `hongdonedu`) → **New repository** → 이름 `digital-class-checkin` → Public → Create.
2. **uploading an existing file** 클릭 → 이 폴더의 파일을 모두 끌어다 놓습니다 (`apps-script`, `assets` 폴더 포함; `_screens` 폴더는 올리지 않아도 됩니다) → Commit changes.
3. **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main` / `/(root)` → Save.
4. 1~2분 후 주소: **https://hongdonedu.github.io/digital-class-checkin/**
   - 학생: `https://hongdonedu.github.io/digital-class-checkin/`
   - 대시보드: `https://hongdonedu.github.io/digital-class-checkin/dashboard.html`
   - 선생님 메뉴: `https://hongdonedu.github.io/digital-class-checkin/teacher.html` (PIN: config.js 의 `TEACHER_PIN`, 기본 2022)
5. 파일을 바꾼 뒤에는 저장소에서 해당 파일 → ✎ 편집 → Commit 하면 1분쯤 뒤 반영됩니다.

---

## (c) 수업 운영 팁

- **학급 QR**: `teacher.html` → PIN 입력 → 학년·교시(·도구) 선택 → 1~10반 QR 이 한 번에 생성됩니다. 인쇄해서 과학실/컴퓨터실 벽에 붙이거나 TV에 띄웁니다.
  QR 주소 형식: `index.html?g=3&c=4&p=2` (학년·반은 잠기고 교시는 미리 선택됨).
- **체크아웃 링크**: `…&phase=after&tool=캔바` 처럼 도구를 미리 넣으면 첫 질문을 건너뛰어 더 빠릅니다.
- **수업 전 1분 / 수업 후 1분**: 체크인 6문항, 체크아웃 6~7문항. 번호를 누르고 바로 시작하면 보통 40~60초입니다.
- **우리 반 지금 보기**: `dashboard.html?g=3&c=4&date=today` — 큰 글씨 모드. 체크아웃 직후 TV에 띄워 "우리 반 기분 4점은 몇 명?" 같은 그래프 읽기 발문에 쓰세요.
- **연구회 자료**: 대시보드의 헤드라인 차트(자신감 수업 전→후)와 "집에서 기기를 많이 쓰는 아이가 수업에서도 잘할까?" 패널이 핵심 비교입니다. 모든 차트는 **표** 버튼으로 숫자를 볼 수 있고, **CSV 내려받기**로 원자료를 받을 수 있습니다.
- 공용 태블릿: 같은 기기에서 같은 날 두 번 체크인하면 안내가 뜹니다. "다시 하기"를 누르면 계속 진행됩니다.
- 하루 응답이 수백 건 수준이면 Apps Script 무료 한도 안에서 충분합니다. 학기 단위로 시트가 1만 행을 넘기면 대시보드 로딩이 느려질 수 있으니 새 시트+새 배포로 학기를 나누는 것을 권합니다.

---

## (d) 그림 교체

`assets/hero.webp` (타이틀 옆 그림, 정사각형 권장 400×400) 와 `assets/mascot.webp` (완료 화면 마스코트, 정사각형 600×600) 파일을 넣으면 **자동으로 표시**됩니다. 파일이 없으면 CSS 로 그린 간단한 일러스트가 나옵니다. (png 를 쓰려면 html 의 `assets/hero.webp` 를 `assets/hero.png` 로 바꿔 주세요.)

이미지 생성 프롬프트 (ChatGPT / Gemini 에 그대로 붙여 넣기):

**1. 마스코트 (assets/mascot.webp)**
> 고급 3D 애니메이션풍, 투명 배경. 초등학생 친구 같은 귀여운 데이터 로봇 마스코트. 둥근 민트색 몸통, 머리 위 코랄색 안테나 구슬, 얼굴 화면에는 밝게 웃는 눈과 작은 막대그래프가 떠 있음. 한 손에 태블릿을 들고 다른 손은 엄지 척. 부드러운 파스텔 조명, 매끈한 플라스틱 질감, 정면 전신, 여백 넉넉하게, 글자 없음.

**2. 타이틀 그림 (assets/hero.webp)**
> 고급 3D 애니메이션풍, 투명 배경. 작은 태블릿 화면에서 떠오르는 알록달록한 데이터 조각들(민트·코랄·노랑 막대그래프 블록, 동그란 점, 별)과 작은 로봇 손이 조각을 하나 올려놓는 모습. 따뜻한 크림색 공책 느낌, 둥글둥글한 형태, 부드러운 그림자, 정사각형 구성, 글자 없음.

**3. 교실 장면 (발표 자료·QR 안내문용, 선택)**
> 고급 3D 애니메이션풍. 밝은 초등학교 컴퓨터실에서 1학년부터 6학년까지 다양한 키의 아이들이 태블릿으로 짧은 체크인을 하고, 벽 TV 에는 민트·코랄·노랑 막대그래프가 떠 있는 장면. 아이들 곁에 민트색 데이터 로봇 마스코트가 서 있음. 따뜻하고 명랑한 분위기, 과장되지 않은 비율, 글자 없음.

---

## 라이브러리

- Chart.js 4.4.1 (cdnjs) — 대시보드 차트
- qrcodejs 1.0.0 (cdnjs) — QR 생성
- Google Fonts: Jua, Noto Sans KR

인터넷이 끊긴 교실에서는 학생 페이지(설문)는 동작하지만 전송은 실패하고 재시도 안내가 뜹니다. 차트·QR 은 인터넷이 필요합니다.
