import os

# =========================================================
# 👇 사용자 설정
# =========================================================
PROJECT_ROOT = r"C:\Users\isy73\remix-of-botida-flow"
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "ai_context_combined.txt")
LIST_FILE = os.path.join(PROJECT_ROOT, "included_files.txt") # 👈 목록 파일 추가

# ✅ 1. 가져올 폴더 목록
TARGET_DIRS = [
    "public", "supabase", 
    "src", 
]

# ✅ 2. 최상위 루트에서 강제 포함할 파일들
FORCE_ROOT_FILES = [
    "package.json", "README.md", ".env", ".gitignore",
    "main.js", "index.js", "index.html"
]

# ✅ 3. 루트 추가 확장자
ROOT_INCLUDE_EXTS = [".js", ".json", ".html", ".md", ".txt", ".py"] 

# 🚫 4. 제외 설정
IGNORE_EXTS = [
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".mp4", ".mp3", ".wav", 
    ".exe", ".dll", ".sys", ".lib", ".obj", ".iso", ".msi", ".bin", ".dat",
    ".ttf", ".woff", ".woff2", ".eot", ".otf",
    ".zip", ".tar", ".gz", ".7z", ".rar", ".pdf", ".sqlite", ".db",
    ".lock", ".log", ".traineddata", ".pyc", ".map", ".gitignore"
]

IGNORE_DIRS = [
    "node_modules", "dist", "build", ".git", ".idea", ".vscode",
    "Tesseract-OCR", "extraResources", "API호출", "재미나이", 
    "logs", "cache", "venv", "__pycache__"
]

IGNORE_FILES = [
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "repomix.config", 
    "local.settings.json", "Thumbs.db", ".DS_Store", "cookies.json", "google_oauth_credentials.json", "py_debug_log.json", "repomix.config.json", "requirements.txt", "설치 모듈.txt", "패키징 명령어.txt", 
]
# =========================================================

def is_ignored(filename):
    if filename in IGNORE_FILES: return True
    if any(filename.lower().endswith(ext) for ext in IGNORE_EXTS): return True
    if filename in [os.path.basename(OUTPUT_FILE), os.path.basename(LIST_FILE), os.path.basename(__file__)]: return True
    return False

def write_file_content(file_path, outfile, manifest_list, is_root=False):
    try:
        rel_path = os.path.relpath(file_path, PROJECT_ROOT).replace("\\", "/")
    except: rel_path = file_path

    try:
        # 파일 내용 읽기
        with open(file_path, "r", encoding="utf-8", errors='ignore') as infile:
            content = infile.read()
            
            # 1. 통합 파일에 쓰기
            outfile.write(f"\n\n{'='*60}\nFile Path: {rel_path}\n{'='*60}\n{content}\n")
            
            # 2. 목록 리스트에 추가 (루트 여부 표시)
            mark = "🌟 [ROOT]" if is_root else "📄 [SUB] "
            manifest_list.append(f"{mark} {rel_path}")
            
            # 콘솔 출력 (너무 빠르면 생략 가능)
            print(f"{mark} {rel_path}")

    except: pass 

def merge_files():
    manifest_list = [] # 파일 목록 저장용 리스트
    total_files = 0
    
    if not os.path.exists(PROJECT_ROOT):
        print(f"❌ 오류: 경로 없음 -> {PROJECT_ROOT}")
        return

    print(f"🚀 병합 시작...")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        outfile.write(f"Project Root: {PROJECT_ROOT}\nIncluded Targets: {', '.join(TARGET_DIRS)}\n\n")

        # 1️⃣ 루트 파일 처리
        for filename in os.listdir(PROJECT_ROOT):
            file_path = os.path.join(PROJECT_ROOT, filename)
            if os.path.isfile(file_path) and not is_ignored(filename):
                is_forced = filename in FORCE_ROOT_FILES
                has_ext = any(filename.lower().endswith(ext) for ext in ROOT_INCLUDE_EXTS)
                
                if is_forced or has_ext:
                    write_file_content(file_path, outfile, manifest_list, is_root=True)
                    total_files += 1

        # 2️⃣ 타겟 폴더 처리
        for target_dir in TARGET_DIRS:
            full_path = os.path.join(PROJECT_ROOT, target_dir)
            if not os.path.exists(full_path): continue
            
            for root, dirs, files in os.walk(full_path):
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
                for filename in files:
                    if not is_ignored(filename):
                        write_file_content(os.path.join(root, filename), outfile, manifest_list)
                        total_files += 1

    # ✅ 목록 파일 별도 저장
    with open(LIST_FILE, "w", encoding="utf-8") as listfile:
        listfile.write("\n".join(manifest_list))

    print("-" * 60)
    print(f"✅ 완료! 총 {total_files}개 파일 병합됨.")
    print(f"📂 통합 파일: {OUTPUT_FILE}")
    print(f"📋 목록 확인: {LIST_FILE}  <-- 이걸 열어보세요!")

if __name__ == "__main__":
    merge_files()