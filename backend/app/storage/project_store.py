import json
from pathlib import Path
from typing import Dict, List, Optional
from app.config import settings
from app.schemas.project import Project

class ProjectStore:
    def __init__(self):
        self._cache: Dict[str, Project] = {}
        self._load_all()

    def _get_project_dir(self, project_id: str) -> Path:
        pdir = settings.PROJECTS_DIR / project_id
        pdir.mkdir(parents=True, exist_ok=True)
        return pdir

    def _get_meta_path(self, project_id: str) -> Path:
        return self._get_project_dir(project_id) / "project.json"

    def _load_all(self):
        if not settings.PROJECTS_DIR.exists():
            return
        for item in settings.PROJECTS_DIR.iterdir():
            if item.is_dir():
                meta_file = item / "project.json"
                if meta_file.exists():
                    try:
                        with open(meta_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            project = Project(**data)
                            self._cache[project.id] = project
                    except Exception as e:
                        print(f"Error loading project {item.name}: {e}")

    def get(self, project_id: str) -> Optional[Project]:
        if project_id in self._cache:
            return self._cache[project_id]
        meta_file = self._get_meta_path(project_id)
        if meta_file.exists():
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    project = Project(**json.load(f))
                    self._cache[project.id] = project
                    return project
            except Exception:
                return None
        return None

    def list_all(self) -> List[Project]:
        return sorted(list(self._cache.values()), key=lambda p: p.created_at, reverse=True)

    def save(self, project: Project) -> Project:
        self._cache[project.id] = project
        meta_path = self._get_meta_path(project.id)
        with open(meta_path, "w", encoding="utf-8") as f:
            f.write(project.model_dump_json(indent=2))
        return project

    def delete(self, project_id: str) -> bool:
        if project_id in self._cache:
            del self._cache[project_id]
        pdir = settings.PROJECTS_DIR / project_id
        if pdir.exists():
            import shutil
            shutil.rmtree(pdir, ignore_errors=True)
            return True
        return False

project_store = ProjectStore()
