
file_path = r"c:\Users\Fei\Desktop\AI应用\Wizard-Duel\components\BattleArena.tsx"

with open(file_path, 'rb') as f:
    content = f.read().decode('utf-8')

# Remove the specific class
new_content = content.replace(' gpu-accelerated', '')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed BattleArena.tsx")
