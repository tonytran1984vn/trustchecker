import os

base_dir = "/Users/dangtranhai/Downloads/TrustChecker/frontend/src/app/(main)"

pages = {
    "executive/tcar": "Capital Exposure (TCAR)",
    "risk/scenario": "Scenario Analysis",
    "executive/actions": "Strategic Actions",
    "executive/approvals": "Approvals & Sign-offs",
    "governance/board": "Board & Committees",
    "governance/reports": "Executive Reports"
}

template = """import { PlaceholderView } from "@/components/ui/PlaceholderView";

export default function Page() {
    return (
        <div className="p-8 h-full">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">{__TITLE__}</h1>
            <PlaceholderView 
                title="{__TITLE__}" 
                description="This high-level governance module is restricted to Tenant Sovereign Authorities and is pending institutional deployment."
                icon="security"
            />
        </div>
    );
}
"""

for path, title in pages.items():
    full_dir = os.path.join(base_dir, path)
    os.makedirs(full_dir, exist_ok=True)
    file_path = os.path.join(full_dir, "page.tsx")
    with open(file_path, "w") as f:
        f.write(template.replace("{__TITLE__}", title))
        
print("Executive placeholder pages generated.")
