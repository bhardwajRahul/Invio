import json
import sys
from pathlib import Path


main_locale = "en"

root = Path(__file__).resolve().parent.parent.parent
en = Path(root / "frontend/i18n/locales/en.json")
files = [
    f
    for f in Path(root / "frontend/i18n/locales").glob("*.json")
    if "en.json" not in str(f)
]


def get_reference_keys():
    with open(en) as f:
        data = json.load(f)
        return data.keys()


en_keys = get_reference_keys()


def find_missing_translations(file):
    lang = file.stem
    with open(file) as f:
        data = json.load(f)
        missing = list(set(en_keys) - set(data.keys()))
        return {
            "file": file.name,
            "lang": lang,
            "missing": {"keys": missing, "count": len(missing)},
        }


def find_additional_translations(file):
    with open(file) as f:
        data = json.load(f)
        additional = list(set(data.keys()) - set(en_keys))
        return {"additional": {"keys": additional, "count": len(additional)}}


result = []
has_issues = False

for file in files:
    data = find_missing_translations(file)
    data.update(find_additional_translations(file))
    result.append(data)

print("Translation Check Results")
print("=" * 50)
print(f"Reference locale (en): {len(en_keys)} keys\n")

for lang in result:
    print(f"Locale: {lang['lang']} ({lang['file']})")

    if lang["missing"]["count"] > 0:
        has_issues = True
        print(f"  Missing translations: {lang['missing']['count']}")
        for key in sorted(lang["missing"]["keys"])[:10]:
            print(f"    - {key}")
        if lang["missing"]["count"] > 10:
            print(f"    ... and {lang['missing']['count'] - 10} more")
    else:
        print("  Missing translations: 0")

    if lang["additional"]["count"] > 0:
        print(f"  Additional translations: {lang['additional']['count']}")
        for key in sorted(lang["additional"]["keys"])[:5]:
            print(f"    - {key}")
        if lang["additional"]["count"] > 5:
            print(f"    ... and {lang['additional']['count'] - 5} more")
    else:
        print("  Additional translations: 0")

    print()

if has_issues:
    print("Some translations are missing!")
    sys.exit(1)
else:
    print("All translations are complete!")
    sys.exit(0)
