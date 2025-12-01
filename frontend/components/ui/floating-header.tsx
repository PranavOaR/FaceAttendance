'use client';

import React from 'react';
import { ShieldCheckIcon, MenuIcon, Moon, Sun } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FloatingHeaderProps {
	links?: Array<{
		label: string;
		href: string;
	}>;
	showLogout?: boolean;
	onLogout?: () => Promise<void>;
}

export function FloatingHeader({
	links = [
		{ label: 'Dashboard', href: '/dashboard' },
		{ label: 'Classes', href: '/class/list' },
		{ label: 'Reports', href: '/reports' },
	],
	showLogout = false,
	onLogout,
}: FloatingHeaderProps) {
	const [open, setOpen] = React.useState(false);
	const [isLoggingOut, setIsLoggingOut] = React.useState(false);
	const [isDarkMode, setIsDarkMode] = React.useState(false);
	const router = useRouter();

	// Initialize dark mode from localStorage on mount
	React.useEffect(() => {
		const savedTheme = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

		setIsDarkMode(shouldBeDark);
		if (shouldBeDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, []);

	const toggleDarkMode = (selected: boolean) => {
		setIsDarkMode(selected);
		if (selected) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	};

	const handleLogout = async () => {
		try {
			setIsLoggingOut(true);
			if (onLogout) {
				await onLogout();
			}
			router.push('/login');
		} catch (error) {
			console.error('Logout failed:', error);
			setIsLoggingOut(false);
		}
	};

	return (
		<header
			className={cn(
				'sticky top-5 z-50',
				'mx-auto w-full max-w-5xl rounded-lg border shadow',
				'bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-lg',
				'px-4 md:px-6',
			)}
		>
			<nav className="mx-auto flex items-center justify-between p-1.5">
				<div className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1">
					<ShieldCheckIcon className="size-5 text-primary" />
					<p className="font-mono text-base font-bold text-primary">IDGuard</p>
				</div>
				<div className="hidden items-center gap-1 lg:flex">
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className={buttonVariants({ variant: 'ghost', size: 'sm' })}
						>
							{link.label}
						</Link>
					))}
				</div>
				<div className="flex items-center gap-2">
					{/* Dark Mode Toggle */}
					<div className="hidden sm:flex items-center gap-2">
						<Switch
							isSelected={isDarkMode}
							onChange={toggleDarkMode}
							className="data-[focus-visible]:ring-offset-background"
						>
							<span className="sr-only">Toggle dark mode</span>
							{isDarkMode ? (
								<Moon className="h-4 w-4" />
							) : (
								<Sun className="h-4 w-4" />
							)}
						</Switch>
					</div>

					{showLogout && (
						<Button
							size="sm"
							variant="outline"
							onClick={handleLogout}
							disabled={isLoggingOut}
							className="hidden sm:inline-flex"
						>
							{isLoggingOut ? 'Logging out...' : 'Logout'}
						</Button>
					)}
					<Sheet open={open} onOpenChange={setOpen}>
						<Button
							size="icon"
							variant="outline"
							onClick={() => setOpen(!open)}
							className="lg:hidden"
						>
							<MenuIcon className="size-4" />
						</Button>
						<SheetContent
							className="bg-background/95 supports-[backdrop-filter]:bg-background/80 gap-0 backdrop-blur-lg"
							showClose={false}
							side="left"
						>
							<div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
								{links.map((link) => (
									<Link
										key={link.href}
										href={link.href}
										className={buttonVariants({
											variant: 'ghost',
											className: 'justify-start',
										})}
										onClick={() => setOpen(false)}
									>
										{link.label}
									</Link>
								))}
							</div>
							<SheetFooter className="flex-col gap-2">
								{/* Dark Mode Toggle in Mobile Menu */}
								<div className="flex items-center justify-between w-full px-2">
									<span className="text-sm font-medium">Dark Mode</span>
									<Switch
										isSelected={isDarkMode}
										onChange={toggleDarkMode}
									>
										{isDarkMode ? (
											<Moon className="h-4 w-4" />
										) : (
											<Sun className="h-4 w-4" />
										)}
									</Switch>
								</div>

								{showLogout && (
									<Button
										variant="outline"
										onClick={async () => {
											setOpen(false);
											await handleLogout();
										}}
										disabled={isLoggingOut}
										className="w-full"
									>
										{isLoggingOut ? 'Logging out...' : 'Logout'}
									</Button>
								)}
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
	);
}
