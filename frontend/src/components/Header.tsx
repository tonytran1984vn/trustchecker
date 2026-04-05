"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Settings, User as UserIcon, LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tc_user");
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("tc_token");
    localStorage.removeItem("tc_refresh");
    localStorage.removeItem("tc_user");
    sessionStorage.removeItem("tc_user");
    document.cookie = "tc_token=; Max-Age=0; path=/";
    document.cookie = "token=; Max-Age=0; path=/";
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-sidebar-border bg-white px-4 shadow-sm sm:px-6">
      
      {/* Left: Mobile Menu Toggle / Search */}
      <div className="flex flex-1 items-center gap-4">
        <form className="hidden w-full max-w-sm lg:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full bg-slate-50 pl-9 rounded-full border-transparent focus-visible:ring-indigo-500 shadow-none h-9 text-sm"
            />
          </div>
        </form>
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:bg-slate-100 rounded-full h-9 w-9 bg-slate-50">
          <Bell className="h-[18px] w-[18px] text-slate-700" />
          <span className="absolute top-0 right-0 -mr-1 -mt-1 flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-bold text-white">2</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 focus:outline-none rounded-full py-1 pr-2 pl-1 hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
            <Avatar className="h-[34px] w-[34px] rounded-full border border-slate-200">
              <AvatarImage src="" alt="Avatar" />
              <AvatarFallback className="bg-[#1A80F8]/10 text-[#1A80F8] font-bold text-sm">
                {user?.username ? user.username.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : "A"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-[15px] font-medium text-slate-700">{user?.username || user?.email?.split('@')[0] || 'Administrator'}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px] border-slate-100 shadow-lg rounded-xl overflow-hidden p-0" align="end" sideOffset={8}>
            <div className="py-1">
              <DropdownMenuItem className="py-2.5 px-4 cursor-pointer text-slate-700 hover:bg-slate-50 hover:text-[#1A80F8] focus:bg-slate-50 focus:text-[#1A80F8] focus:outline-none flex items-center" onClick={() => router.push('/platform/platform/profile')}>
                <UserIcon className="mr-3 h-[18px] w-[18px]" />
                <span className="text-[15px] font-medium">Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-2.5 px-4 cursor-pointer text-slate-700 hover:bg-slate-50 hover:text-[#1A80F8] focus:bg-slate-50 focus:text-[#1A80F8] focus:outline-none flex items-center" onClick={() => router.push('/platform/platform/profile')}>
                <Settings className="mr-3 h-[18px] w-[18px]" />
                <span className="text-[15px] font-medium">Security Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="py-2.5 px-4 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 focus:outline-none flex items-center" onClick={handleLogout}>
                <LogOut className="mr-3 h-[18px] w-[18px]" />
                <span className="text-[15px] font-medium">Logout</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
