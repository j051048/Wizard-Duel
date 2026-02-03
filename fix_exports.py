import os

files = [
    (r"c:\Users\Fei\Desktop\AI应用\Wizard-Duel\components\BattleArena.tsx", "BattleArena"),
    (r"c:\Users\Fei\Desktop\AI应用\Wizard-Duel\components\DeckBuilder.tsx", "DeckBuilder"),
    (r"c:\Users\Fei\Desktop\AI应用\Wizard-Duel\components\DungeonMap.tsx", "DungeonMap"),
    (r"c:\Users\Fei\Desktop\AI应用\Wizard-Duel\components\ResultsModal.tsx", "ResultsModal"),
    (r"c:\Users\Fei\Desktop\AI应用\Wizard-Duel\components\TavernMode.tsx", "TavernMode")
]

for file_path, component_name in files:
    if os.path.exists(file_path):
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Check for UTF-16 LE BOM
        if content.startswith(b'\xff\xfe'):
            content = content.decode('utf-16-le').encode('utf-8')
        
        # Clean up the specific corruption
        # Look for the last '};' and truncate everything after it
        # Then add proper export
        content_str = content.decode('utf-8', errors='ignore')
        last_brace = content_str.rfind('};')
        if last_brace != -1:
            clean_content = content_str[:last_brace+2]
            final_content = clean_content + f"\n\nexport default {component_name};\n"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(final_content)
            print(f"Fixed {component_name}")
        else:
            print(f"Could not find end of component in {component_name}")
