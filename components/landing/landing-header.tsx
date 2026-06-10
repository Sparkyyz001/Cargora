"use client"

import * as React from "react"
import Link from "next/link"

import "./landing-header.css"

const NAV_LINKS = [
  { label: "Возможности", href: "#features" },
  { label: "Статистика", href: "#workflow" },
  { label: "Тарифы", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

export function LandingHeader() {
  return (
    <header className="cargora-glass-nav">
      <div className="cargora-glass-inner">
        {/* Логотип слева */}
        <Link href="/" className="cargora-glass-logo">
          Cargora
        </Link>

        {/* Ссылки по центру */}
        <nav className="cargora-glass-links" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Действия справа */}
        <div className="cargora-glass-actions">
          <Link href="/register" className="cargora-glass-register">
            Регистрация
          </Link>
          <Link href="/login" className="cargora-glass-login">
            Войти
          </Link>
        </div>
      </div>
    </header>
  )
}
