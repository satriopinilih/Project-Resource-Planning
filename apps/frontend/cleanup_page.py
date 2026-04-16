import sys, re

with open('src/app/mrkt/projects/[id]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Capture the Project Timeline section
# Use a more flexible regex for Timeline
timeline_match = re.search(r'(<section className=\"bg\[#292B2F\] border border-gray-700/50 rounded-xl p-8 shadow-sm\">\s*<h2 className=\"text\[18px\] font-bold text-white mb-6\">Project Timeline</h2>[\s\S]*?</section>)', content)
timeline_html = timeline_match.group(0) if timeline_match else ""

# 2. Capture Required Skills section just in case it is above the unified view
skills_match = re.search(r'(\{\(project\.requiredSkills\?\.length \?\? 0\) > 0 && \([\s\S]*?</div>\s*\)\})', content)
skills_html = skills_match.group(0) if skills_match else ""

# 3. Simplify the UI block
start_marker = '{/* Unified UI View - Card Based Layout */}'
header_idx = content.find(start_marker)
end_main_idx = content.find('</main>', header_idx)

if header_idx != -1 and end_main_idx != -1:
    replacement = f"\n            {{/* Simplified Project View */}}\n            {skills_html}\n            {timeline_html}\n          "
    content = content[:header_idx] + replacement + content[end_main_idx:]

# 4. Remove unused imports and state
# List of things to remove
to_remove = [
    r'import SmartRecommendationPanel[\s\S]*?;',
    r'const \[assignModalOpen,[\s\S]*?useState\(false\);',
    r'const \[employees,[\s\S]*?useState<BackendEmployee\[\]>\(\[\]\);',
    r'const \[employeesLoading,[\s\S]*?useState\(false\);',
    r'const \[empSearch,[\s\S]*?useState\(\"\"\);',
    r'const \[selectedEmp,[\s\S]*?useState<BackendEmployee \| null>\(null\);',
    r'const \[assignRole,[\s\S]*?useState\(\"\"\);',
    r'const \[assignStart,[\s\S]*?useState\(\"\"\);',
    r'const \[assignEnd,[\s\S]*?useState\(\"\"\);',
    r'const \[assigning,[\s\S]*?useState\(false\);',
    r'const \[assignError,[\s\S]*?useState<string \| null>\(null\);',
    r'const \[removingUserId,[\s\S]*?useState<number \| null>\(null\);',
    r'const openAssignModal = [\s\S]*?};',
    r'const handleAssign = [\s\S]*?};',
    r'const handleRemoveMember = [\s\S]*?};',
    r'const getEmployeeAvailability = [\s\S]*?};',
    r'const filteredEmployees = [\s\S]*?\[empSearch, employees\]\);',
    # Modal JSX
    r'\{/\* ── Assign Member Modal \(Redesigned\) ── \*/\}[\s\S]*?\{assignModalOpen && \([\s\S]*?\}\s*\}\s*\)\}',
]

# We need to be careful with multiline and overlapping matches for state
# I'll use a more manual approach for state since they are contiguous

# Actually, I'll just use a single regex for the whole block of assignment state
state_block_regex = r'  // Assign modal state[\s\S]*?const handleRemoveMember = async \(memberId: number\) => \{[\s\S]*?\n  \};\n\n'
content = re.sub(state_block_regex, '', content)

# Remove the Modal JSX specifically
modal_regex = r'\{/\* ── Assign Member Modal \(Redesigned\) ── \*/\}\s*\{assignModalOpen && \([\s\S]*?</div>\s*</div>\s*\)\}'
content = re.sub(modal_regex, '', content)

# Remove the smart recommendation import
content = re.sub(r'import SmartRecommendationPanel from "@/app/dashboard/gm/components/SmartRecommendationPanel";\s*', '', content)

# Clean up unused icons
icons = ["Users2", "UserPlus", "ShieldAlert", "Search", "Target", "TrendingUp", "CheckCircle2"]
for icon in icons:
    content = content.replace(f"  {icon},\n", "")
    content = content.replace(f" {icon},", "")

with open('src/app/mrkt/projects/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
