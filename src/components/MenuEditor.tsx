'use client'
import { useState } from 'react'
import type { Store } from '@/types'
import type { Lang, Translations } from '@/lib/i18n'
import { CAT_ACCENT } from '@/lib/i18n'

interface Props {
  store: Store
  lang: Lang
  t: Translations
  F: React.CSSProperties
  onSave: (updated: Store) => void
}

const uid = () => Math.random().toString(36).slice(2, 8)

const inputSt: React.CSSProperties = {
  background: '#141414', border: '1px solid #222', borderRadius: 7,
  padding: '8px 10px', color: '#f0ece4', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

interface Choice { id: string; ko: string; en: string; extraPrice?: string }
interface Option { id: string; key: string; labelKo: string; labelEn: string; choices: Choice[] }
interface MenuDraft { id: string; nameKo: string; nameEn: string; price: string; options: Option[] }
interface CatDraft { id: string; nameKo: string; nameEn: string; menus: MenuDraft[] }

export default function MenuEditor({ store, lang, t, F, onSave }: Props) {
  const buildCats = (s: Store): CatDraft[] =>
    Object.entries(s.categories || {}).map(([catName, menuNames]) => ({
      id: uid(), nameKo: catName, nameEn: (t.cats as Record<string, string>)[catName] || catName,
      menus: (menuNames as string[]).map(mn => ({
        id: uid(), nameKo: mn,
        nameEn: s.menu_names?.[mn]?.en || '',
        price: s.prices?.[mn] || '',
        options: (s.menu_options?.[mn] || []).map(opt => ({
          id: uid(), key: opt.key,
          labelKo: opt.labelKo, labelEn: opt.labelEn,
          choices: opt.choices.map(c => ({ id: uid(), ko: c.ko, en: c.en, extraPrice: c.extraPrice || '' })),
        })),
      })),
    }))

  const [cats, setCats] = useState<CatDraft[]>(() => buildCats(store))
  const [storeName, setStoreName] = useState({ ko: store.name, en: store.name_en })
  const [preview, setPreview] = useState(false)
  const [saved, setSaved] = useState(false)

  const updateCat = (idx: number, updated: CatDraft) => {
    const c = [...cats]; c[idx] = updated; setCats(c)
  }
  const deleteCat = (idx: number) => setCats(cats.filter((_, i) => i !== idx))
  const addCat = () => setCats([...cats, { id: uid(), nameKo: '', nameEn: '', menus: [{ id: uid(), nameKo: '', nameEn: '', price: '', options: [] }] }])

  const handleSave = () => {
    const categories: Record<string, string[]> = {}
    const prices: Record<string, string> = {}
    const menu_names: Record<string, { ko: string; en: string }> = {}
    const menu_options: Record<string, { key: string; labelKo: string; labelEn: string; choices: { ko: string; en: string; extraPrice: string }[] }[]> = {}

    cats.forEach(cat => {
      const catMenus = cat.menus.map(m => m.nameKo).filter(Boolean)
      if (!cat.nameKo || catMenus.length === 0) return
      categories[cat.nameKo] = catMenus
      cat.menus.forEach(m => {
        if (!m.nameKo) return
        prices[m.nameKo] = m.price
        menu_names[m.nameKo] = { ko: m.nameKo, en: m.nameEn }
        if (m.options.length > 0) {
          menu_options[m.nameKo] = m.options.map(opt => ({
            key: opt.key || opt.id,
            labelKo: opt.labelKo, labelEn: opt.labelEn,
            choices: opt.choices.map(c => ({ ko: c.ko, en: c.en, extraPrice: c.extraPrice })),
          }))
        }
      })
    })

    onSave({ ...store, name: storeName.ko, name_en: storeName.en, categories, prices, menu_names, menu_options })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* 툴바 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setPreview(p => !p)}
          style={{ background: preview ? '#1a2a1a' : '#141414', border: `1px solid ${preview ? '#6fcf97' : '#2a2a2a'}`, color: preview ? '#6fcf97' : '#888', borderRadius: 16, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 700, ...F }}>
          {preview ? t.editMode : t.preview}
        </button>
        <button onClick={handleSave}
          style={{ background: saved ? '#1a2a1a' : '#c8a96e', border: 'none', color: saved ? '#6fcf97' : '#080808', borderRadius: 16, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 700, transition: 'all 0.3s', ...F }}>
          {saved ? t.savedBtn : t.saveBtn}
        </button>
      </div>

      {/* 가게명 */}
      <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#c8a96e', fontWeight: 700, letterSpacing: 1, marginBottom: 10, ...F }}>{t.storeInfo.toUpperCase()}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇰🇷 {t.koName}</div>
            <input value={storeName.ko} onChange={e => setStoreName({ ...storeName, ko: e.target.value })} style={{ ...inputSt, fontWeight: 700, ...F }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇺🇸 {t.enName}</div>
            <input value={storeName.en} onChange={e => setStoreName({ ...storeName, en: e.target.value })} style={{ ...inputSt, color: '#c8a96e', ...F }} />
          </div>
        </div>
      </div>

      {/* 편집 모드 */}
      {!preview && (
        <>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 14, ...F }}>{t.menuSetup.toUpperCase()}</div>
          {cats.map((cat, ci) => (
            <div key={cat.id} style={{ marginBottom: 20 }}>
              {/* 카테고리 헤더 */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <div style={{ width: 4, height: 36, background: '#c8a96e', borderRadius: 2, flexShrink: 0 }} />
                <input value={cat.nameKo} onChange={e => updateCat(ci, { ...cat, nameKo: e.target.value })}
                  placeholder='카테고리명 (예: 라멘류)' style={{ flex: 2, ...inputSt, fontWeight: 900, fontSize: 14, ...F }} />
                <input value={cat.nameEn} onChange={e => updateCat(ci, { ...cat, nameEn: e.target.value })}
                  placeholder='Category (EN)' style={{ flex: 2, ...inputSt, color: '#c8a96e', ...F }} />
                <button onClick={() => deleteCat(ci)} disabled={cats.length === 1}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: cats.length === 1 ? '#141414' : '#2a1a1a', color: cats.length === 1 ? '#333' : '#e05a5a', cursor: cats.length === 1 ? 'default' : 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
              </div>

              {/* 메뉴들 */}
              {cat.menus.map((menu, mi) => {
                const updateMenu = (updated: MenuDraft) => { const m = [...cat.menus]; m[mi] = updated; updateCat(ci, { ...cat, menus: m }) }
                const deleteMenu = () => { if (cat.menus.length === 1) return; updateCat(ci, { ...cat, menus: cat.menus.filter((_, i) => i !== mi) }) }
                return (
                  <div key={menu.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', padding: '10px 12px' }}>
                      <input value={menu.nameKo} onChange={e => updateMenu({ ...menu, nameKo: e.target.value })}
                        placeholder='메뉴명' style={{ flex: 2.5, ...inputSt, fontWeight: 700, ...F }} />
                      <input value={menu.nameEn} onChange={e => updateMenu({ ...menu, nameEn: e.target.value })}
                        placeholder='Menu (EN)' style={{ flex: 2.5, ...inputSt, color: '#c8a96e', ...F }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1.2 }}>
                        <input value={menu.price} onChange={e => updateMenu({ ...menu, price: e.target.value })}
                          placeholder='가격' style={{ flex: 1, ...inputSt, textAlign: 'right', ...F }} />
                        <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>원</span>
                      </div>
                      <button onClick={deleteMenu} disabled={cat.menus.length === 1}
                        style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: cat.menus.length === 1 ? '#141414' : '#2a1a1a', color: cat.menus.length === 1 ? '#333' : '#e05a5a', cursor: cat.menus.length === 1 ? 'default' : 'pointer', fontSize: 12, flexShrink: 0 }}>✕</button>
                    </div>

                    {/* 옵션들 */}
                    {menu.options.length > 0 && (
                      <div style={{ padding: '0 12px 8px' }}>
                        {menu.options.map((opt, oi) => {
                          const updateOpt = (updated: Option) => { const o = [...menu.options]; o[oi] = updated; updateMenu({ ...menu, options: o }) }
                          return (
                            <div key={opt.id} style={{ background: '#111', borderRadius: 10, padding: '10px 12px', marginBottom: 6, border: '1px solid #1e1e1e' }}>
                              <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                                <div style={{ width: 3, height: 28, background: '#c8a96e', borderRadius: 2, flexShrink: 0 }} />
                                <input value={opt.labelKo} onChange={e => updateOpt({ ...opt, labelKo: e.target.value })}
                                  placeholder='옵션명 (예: 마늘 양 조절)' style={{ flex: 1, ...inputSt, fontWeight: 700, fontSize: 12, ...F }} />
                                <input value={opt.labelEn} onChange={e => updateOpt({ ...opt, labelEn: e.target.value })}
                                  placeholder='Option (EN)' style={{ flex: 1, ...inputSt, color: '#c8a96e', fontSize: 12, ...F }} />
                                <button onClick={() => updateMenu({ ...menu, options: menu.options.filter((_, i) => i !== oi) })}
                                  style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#2a1a1a', color: '#e05a5a', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}>✕</button>
                              </div>
                              <div style={{ display: 'flex', gap: 4, marginBottom: 4, paddingLeft: 11 }}>
                                <div style={{ flex: 2, fontSize: 9, color: '#444', letterSpacing: 1 }}>한국어</div>
                                <div style={{ flex: 2, fontSize: 9, color: '#444', letterSpacing: 1 }}>ENGLISH</div>
                                <div style={{ flex: 1, fontSize: 9, color: '#444', textAlign: 'right' }}>+금액</div>
                                <div style={{ width: 22 }} />
                              </div>
                              {opt.choices.map((c, chi) => {
                                const updateChoice = (updated: Choice) => { const ch = [...opt.choices]; ch[chi] = updated; updateOpt({ ...opt, choices: ch }) }
                                return (
                                  <div key={c.id} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, paddingLeft: 11 }}>
                                    <input value={c.ko} onChange={e => updateChoice({ ...c, ko: e.target.value })}
                                      placeholder='선택지' style={{ flex: 2, ...inputSt, fontSize: 12, padding: '6px 8px', ...F }} />
                                    <input value={c.en} onChange={e => updateChoice({ ...c, en: e.target.value })}
                                      placeholder='Choice' style={{ flex: 2, ...inputSt, fontSize: 12, padding: '6px 8px', color: '#c8a96e', ...F }} />
                                    <input value={c.extraPrice} onChange={e => updateChoice({ ...c, extraPrice: e.target.value })}
                                      placeholder='0' style={{ flex: 1, ...inputSt, fontSize: 12, padding: '6px 8px', textAlign: 'right', color: '#6fcf97', ...F }} />
                                    <button onClick={() => { if (opt.choices.length > 1) updateOpt({ ...opt, choices: opt.choices.filter((_, i) => i !== chi) }) }}
                                      disabled={opt.choices.length <= 1}
                                      style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: opt.choices.length > 1 ? '#2a1a1a' : '#181818', color: opt.choices.length > 1 ? '#e05a5a' : '#333', cursor: opt.choices.length > 1 ? 'pointer' : 'default', fontSize: 10, flexShrink: 0 }}>✕</button>
                                  </div>
                                )
                              })}
                              <button onClick={() => updateOpt({ ...opt, choices: [...opt.choices, { id: uid(), ko: '', en: '', extraPrice: '' }] })}
                                style={{ marginTop: 4, marginLeft: 11, background: 'none', border: '1px dashed #2a2a2a', borderRadius: 6, padding: '3px 10px', color: '#555', fontSize: 11, cursor: 'pointer', ...F }}>
                                {t.addChoice}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div style={{ padding: '0 12px 10px' }}>
                      <button
                        onClick={() => updateMenu({ ...menu, options: [...menu.options, { id: uid(), key: uid(), labelKo: '', labelEn: '', choices: [{ id: uid(), ko: '', en: '', extraPrice: '' }, { id: uid(), ko: '', en: '', extraPrice: '' }] }] })}
                        style={{ width: '100%', background: 'none', border: '1px dashed #222', borderRadius: 7, padding: '6px', color: '#484848', fontSize: 11, cursor: 'pointer', ...F }}>
                        {t.addOption}
                      </button>
                    </div>
                  </div>
                )
              })}
              <button onClick={() => updateCat(ci, { ...cat, menus: [...cat.menus, { id: uid(), nameKo: '', nameEn: '', price: '', options: [] }] })}
                style={{ width: '100%', background: '#0d0d0d', border: '1.5px dashed #1e1e1e', borderRadius: 10, padding: '9px', color: '#484848', fontSize: 12, cursor: 'pointer', ...F }}>
                {t.addMenu}
              </button>
            </div>
          ))}
          <button onClick={addCat}
            style={{ width: '100%', background: '#0d0d0d', border: '2px dashed #1a1a1a', borderRadius: 12, padding: '12px', color: '#484848', fontSize: 13, cursor: 'pointer', fontWeight: 700, ...F }}>
            {t.addCategory}
          </button>
        </>
      )}

      {/* 미리보기 */}
      {preview && (
        <div>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 16, ...F }}>PREVIEW</div>
          {cats.map(cat => (
            <div key={cat.id} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#c8a96e', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 14, background: '#c8a96e', borderRadius: 2 }} />
                {cat.nameKo} {cat.nameEn && <span style={{ fontSize: 10, color: '#555', fontWeight: 400 }}>/ {cat.nameEn}</span>}
              </div>
              {cat.menus.filter(m => m.nameKo).map(menu => (
                <div key={menu.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 14px', marginBottom: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: menu.options.length > 0 ? 8 : 0 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13, ...F }}>{menu.nameKo}</span>
                      {menu.nameEn && <span style={{ fontSize: 10, color: '#666', marginLeft: 8, ...F }}>{menu.nameEn}</span>}
                    </div>
                    {menu.price && <span style={{ color: '#c8a96e', fontWeight: 700, fontSize: 12, ...F }}>{menu.price}원</span>}
                  </div>
                  {menu.options.map(opt => (
                    <div key={opt.id} style={{ display: 'flex', gap: 6, marginBottom: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#777', ...F }}>{opt.labelKo}</span>
                      <span style={{ fontSize: 11, color: '#484848' }}>:</span>
                      {opt.choices.filter(c => c.ko).map((c, i) => (
                        <span key={c.id} style={{ fontSize: 11 }}>
                          {i > 0 && <span style={{ color: '#333' }}> / </span>}
                          <span style={{ color: c.extraPrice ? '#6fcf97' : '#ccc', ...F }}>
                            {c.ko}{c.extraPrice ? ` (+${c.extraPrice}원)` : ''}
                          </span>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
