'use client'
import { useState, useEffect } from 'react'
import type { Store } from '@/types'
import type { Lang, Translations } from '@/lib/i18n'
import { CategoryPicker, type FoodCat } from '@/components/CategoryPicker'

interface Props {
  store: Store
  lang: Lang
  t: Translations
  F: React.CSSProperties
  onSave: (updated: Store) => Promise<void>
}

const uid = () => Math.random().toString(36).slice(2, 8)

const inputSt: React.CSSProperties = {
  background: '#141414', border: '1px solid #222', borderRadius: 7,
  padding: '8px 10px', color: '#f0ece4', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

interface Choice { id: string; ko: string; en: string; extraPrice: string }
interface Option { id: string; key: string; labelKo: string; labelEn: string; choices: Choice[] }
interface SectionMenu { id: string; nameKo: string; nameEn: string; price: string; options: Option[]; foodCategoryId: string }
interface MenuSection { id: string; nameKo: string; menus: SectionMenu[] }

const EMPTY_MENU = (): SectionMenu => ({ id: uid(), nameKo: '', nameEn: '', price: '', options: [], foodCategoryId: '' })
const EMPTY_SECTION = (): MenuSection => ({ id: uid(), nameKo: '', menus: [EMPTY_MENU()] })

// 순서 이동 헬퍼
function moveItem<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const next = [...arr]
  const target = idx + dir
  if (target < 0 || target >= next.length) return next
  ;[next[idx], next[target]] = [next[target], next[idx]]
  return next
}

export default function MenuEditor({ store, t, F, onSave }: Props) {
  const [storeName, setStoreName] = useState({ ko: store.name, en: store.name_en })
  const [sections, setSections] = useState<MenuSection[]>([])
  const [foodCategories, setFoodCategories] = useState<FoodCat[]>([])
  const [preview, setPreview] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/food-categories').then(r => r.json()),
      fetch(`/api/store-category-map?store_id=${store.id}`).then(r => r.json()),
    ]).then(([cats, mapData]) => {
      if (Array.isArray(cats)) setFoodCategories(cats)

      // store_category_map: 섹션명 → food_category_id
      const catToFoodId: Record<string, string> = {}
      if (Array.isArray(mapData)) {
        mapData.forEach((d: { store_category: string; food_category_id: string }) => {
          catToFoodId[d.store_category] = d.food_category_id
        })
      }

      const loaded: MenuSection[] = Object.entries(store.categories || {}).map(([sectionName, names]) => ({
        id: uid(),
        nameKo: sectionName,
        menus: (names as string[]).map(nameKo => ({
          id: uid(),
          nameKo,
          nameEn: store.menu_names?.[nameKo]?.en || '',
          price: store.prices?.[nameKo] || '',
          foodCategoryId: catToFoodId[sectionName] || '',
          options: (store.menu_options?.[nameKo] || []).map((opt: { key: string; labelKo: string; labelEn: string; choices: { ko: string; en: string; extraPrice?: string }[] }) => ({
            id: uid(), key: opt.key,
            labelKo: opt.labelKo, labelEn: opt.labelEn,
            choices: opt.choices.map(c => ({ id: uid(), ko: c.ko, en: c.en, extraPrice: c.extraPrice ?? '' })),
          })),
        })),
      }))
      setSections(loaded.length > 0 ? loaded : [EMPTY_SECTION()])
    })
  }, [store])

  // ── 섹션 조작 ──
  const updateSection = (si: number, updated: MenuSection) =>
    setSections(s => { const n = [...s]; n[si] = updated; return n })
  const deleteSection = (si: number) =>
    setSections(s => s.length > 1 ? s.filter((_, i) => i !== si) : s)

  // ── 저장 ──
  const handleSave = async () => {
    const categories: Record<string, string[]> = {}
    const prices: Record<string, string> = {}
    const menu_names: Record<string, { ko: string; en: string }> = {}
    const menu_options: Record<string, { key: string; labelKo: string; labelEn: string; choices: { ko: string; en: string; extraPrice: string }[] }[]> = {}

    sections.forEach(sec => {
      const validMenus = sec.menus.filter(m => m.nameKo.trim())
      if (!sec.nameKo.trim() || validMenus.length === 0) return
      categories[sec.nameKo] = validMenus.map(m => m.nameKo)
      validMenus.forEach(m => {
        prices[m.nameKo] = m.price
        menu_names[m.nameKo] = { ko: m.nameKo, en: m.nameEn }
        if (m.options.length > 0) {
          menu_options[m.nameKo] = m.options.map(opt => ({
            key: opt.key || opt.id,
            labelKo: opt.labelKo, labelEn: opt.labelEn,
            choices: opt.choices.map(c => ({ ko: c.ko, en: c.en, extraPrice: c.extraPrice ?? '' })),
          }))
        }
      })
    })

    // store_category_map: 섹션별 고유 food_category 수집
    const mappings: { storeCategory: string; foodCategoryId: string }[] = []
    sections.forEach(sec => {
      if (!sec.nameKo.trim()) return
      const seen = new Set<string>()
      sec.menus.forEach(m => {
        if (!m.foodCategoryId || seen.has(m.foodCategoryId)) return
        seen.add(m.foodCategoryId)
        mappings.push({ storeCategory: sec.nameKo, foodCategoryId: m.foodCategoryId })
      })
    })

    await Promise.all([
      onSave({ ...store, name: storeName.ko, name_en: storeName.en, categories, prices, menu_names, menu_options }),
      fetch('/api/store-category-map', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, mappings }),
      }),
    ])

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const arrowBtn = (label: string, onClick: () => void, disabled: boolean) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: 22, height: 22, border: '1px solid #2a2a2a', borderRadius: 5,
      background: disabled ? '#111' : '#1a1a1a', color: disabled ? '#333' : '#888',
      cursor: disabled ? 'default' : 'pointer', fontSize: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>{label}</button>
  )

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
            <input value={storeName.ko} onChange={e => setStoreName(n => ({ ...n, ko: e.target.value }))} style={{ ...inputSt, fontWeight: 700, ...F }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4, ...F }}>🇺🇸 {t.enName}</div>
            <input value={storeName.en} onChange={e => setStoreName(n => ({ ...n, en: e.target.value }))} style={{ ...inputSt, color: '#c8a96e', ...F }} />
          </div>
        </div>
      </div>

      {/* ── 편집 모드 ── */}
      {!preview && (
        <>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 14, ...F }}>메뉴 구성</div>

          {sections.map((sec, si) => (
            <div key={sec.id} style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
              {/* 섹션 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#111', borderBottom: '1px solid #1e1e1e' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {arrowBtn('▲', () => setSections(s => moveItem(s, si, -1)), si === 0)}
                  {arrowBtn('▼', () => setSections(s => moveItem(s, si, 1)), si === sections.length - 1)}
                </div>
                <div style={{ width: 3, height: 28, background: '#c8a96e', borderRadius: 2, flexShrink: 0 }} />
                <input
                  value={sec.nameKo}
                  onChange={e => updateSection(si, { ...sec, nameKo: e.target.value })}
                  placeholder="섹션명 (예: 라멘류, 사이드, 주류)"
                  style={{ flex: 1, ...inputSt, fontWeight: 700, fontSize: 14, ...F, background: '#111', border: '1px solid #2a2a2a' }}
                />
                <span style={{ fontSize: 10, color: '#444', flexShrink: 0, ...F }}>섹션</span>
                <button
                  onClick={() => deleteSection(si)}
                  disabled={sections.length === 1}
                  style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: sections.length === 1 ? '#141414' : '#2a1a1a', color: sections.length === 1 ? '#333' : '#e05a5a', cursor: sections.length === 1 ? 'default' : 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
              </div>

              {/* 메뉴 목록 */}
              <div style={{ padding: '10px 12px' }}>
                {sec.menus.map((menu, mi) => {
                  const updMenu = (u: SectionMenu) => updateSection(si, { ...sec, menus: sec.menus.map((m, i) => i === mi ? u : m) })
                  const delMenu = () => sec.menus.length > 1 && updateSection(si, { ...sec, menus: sec.menus.filter((_, i) => i !== mi) })
                  return (
                    <div key={menu.id} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, marginBottom: 8, padding: '10px 10px 8px' }}>
                      {/* 1행: 순서 버튼 + 메뉴명 + EN + 삭제 */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                          {arrowBtn('▲', () => updateSection(si, { ...sec, menus: moveItem(sec.menus, mi, -1) }), mi === 0)}
                          {arrowBtn('▼', () => updateSection(si, { ...sec, menus: moveItem(sec.menus, mi, 1) }), mi === sec.menus.length - 1)}
                        </div>
                        <input value={menu.nameKo} onChange={e => updMenu({ ...menu, nameKo: e.target.value })}
                          placeholder='메뉴명' style={{ flex: 1, ...inputSt, fontWeight: 700, ...F }} />
                        <input value={menu.nameEn} onChange={e => updMenu({ ...menu, nameEn: e.target.value })}
                          placeholder='Menu (EN)' style={{ flex: 1, ...inputSt, color: '#c8a96e', ...F }} />
                        <button onClick={delMenu} disabled={sec.menus.length === 1}
                          style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: sec.menus.length === 1 ? '#141414' : '#2a1a1a', color: sec.menus.length === 1 ? '#333' : '#e05a5a', cursor: sec.menus.length === 1 ? 'default' : 'pointer', fontSize: 11, flexShrink: 0 }}>✕</button>
                      </div>
                      {/* 2행: 가격 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 50 }}>
                        <input value={menu.price} onChange={e => updMenu({ ...menu, price: e.target.value })}
                          placeholder='가격 입력' style={{ width: 120, ...inputSt, textAlign: 'right', ...F }} />
                        <span style={{ fontSize: 12, color: '#555', flexShrink: 0, ...F }}>원</span>
                      </div>

                      {/* 카테고리 피커 */}
                      <CategoryPicker
                        menuName={menu.nameKo}
                        value={menu.foodCategoryId}
                        onChange={id => updMenu({ ...menu, foodCategoryId: id })}
                        foodCategories={foodCategories}
                      />

                      {/* 옵션 */}
                      {menu.options.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {menu.options.map((opt, oi) => {
                            const updOpt = (u: Option) => updMenu({ ...menu, options: menu.options.map((o, i) => i === oi ? u : o) })
                            return (
                              <div key={opt.id} style={{ background: '#0d0d0d', borderRadius: 8, padding: '8px 10px', marginBottom: 6, border: '1px solid #1a1a1a' }}>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                                  <div style={{ width: 3, height: 24, background: '#c8a96e', borderRadius: 2, flexShrink: 0 }} />
                                  <input value={opt.labelKo} onChange={e => updOpt({ ...opt, labelKo: e.target.value })}
                                    placeholder='옵션명' style={{ flex: 1, ...inputSt, fontWeight: 700, fontSize: 12, ...F }} />
                                  <input value={opt.labelEn} onChange={e => updOpt({ ...opt, labelEn: e.target.value })}
                                    placeholder='Option (EN)' style={{ flex: 1, ...inputSt, color: '#c8a96e', fontSize: 12, ...F }} />
                                  <button onClick={() => updMenu({ ...menu, options: menu.options.filter((_, i) => i !== oi) })}
                                    style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#2a1a1a', color: '#e05a5a', cursor: 'pointer', fontSize: 10, flexShrink: 0 }}>✕</button>
                                </div>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 4, paddingLeft: 11 }}>
                                  <div style={{ flex: 2, fontSize: 9, color: '#444', letterSpacing: 1 }}>한국어</div>
                                  <div style={{ flex: 2, fontSize: 9, color: '#444', letterSpacing: 1 }}>ENGLISH</div>
                                  <div style={{ flex: 1, fontSize: 9, color: '#444', textAlign: 'right' }}>+금액</div>
                                  <div style={{ width: 22 }} />
                                </div>
                                {opt.choices.map((c, chi) => {
                                  const updChoice = (u: Choice) => updOpt({ ...opt, choices: opt.choices.map((ch, i) => i === chi ? u : ch) })
                                  return (
                                    <div key={c.id} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, paddingLeft: 11 }}>
                                      <input value={c.ko} onChange={e => updChoice({ ...c, ko: e.target.value })}
                                        placeholder='선택지' style={{ flex: 2, ...inputSt, fontSize: 12, padding: '6px 8px', ...F }} />
                                      <input value={c.en} onChange={e => updChoice({ ...c, en: e.target.value })}
                                        placeholder='Choice' style={{ flex: 2, ...inputSt, fontSize: 12, padding: '6px 8px', color: '#c8a96e', ...F }} />
                                      <input value={c.extraPrice} onChange={e => updChoice({ ...c, extraPrice: e.target.value })}
                                        placeholder='0' style={{ flex: 1, ...inputSt, fontSize: 12, padding: '6px 8px', textAlign: 'right', color: '#6fcf97', ...F }} />
                                      <button onClick={() => opt.choices.length > 1 && updOpt({ ...opt, choices: opt.choices.filter((_, i) => i !== chi) })}
                                        disabled={opt.choices.length <= 1}
                                        style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: opt.choices.length > 1 ? '#2a1a1a' : '#181818', color: opt.choices.length > 1 ? '#e05a5a' : '#333', cursor: opt.choices.length > 1 ? 'pointer' : 'default', fontSize: 10, flexShrink: 0 }}>✕</button>
                                    </div>
                                  )
                                })}
                                <button onClick={() => updOpt({ ...opt, choices: [...opt.choices, { id: uid(), ko: '', en: '', extraPrice: '' }] })}
                                  style={{ marginTop: 4, marginLeft: 11, background: 'none', border: '1px dashed #2a2a2a', borderRadius: 6, padding: '3px 10px', color: '#555', fontSize: 11, cursor: 'pointer', ...F }}>
                                  {t.addChoice}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <button onClick={() => updMenu({ ...menu, options: [...menu.options, { id: uid(), key: uid(), labelKo: '', labelEn: '', choices: [{ id: uid(), ko: '', en: '', extraPrice: '' }, { id: uid(), ko: '', en: '', extraPrice: '' }] }] })}
                        style={{ width: '100%', background: 'none', border: '1px dashed #1e1e1e', borderRadius: 6, padding: '5px', color: '#383838', fontSize: 11, cursor: 'pointer', marginTop: 8, ...F }}>
                        {t.addOption}
                      </button>
                    </div>
                  )
                })}
                <button onClick={() => updateSection(si, { ...sec, menus: [...sec.menus, EMPTY_MENU()] })}
                  style={{ width: '100%', background: 'none', border: '1.5px dashed #1e1e1e', borderRadius: 8, padding: '8px', color: '#484848', fontSize: 12, cursor: 'pointer', ...F }}>
                  {t.addMenu}
                </button>
              </div>
            </div>
          ))}

          <button onClick={() => setSections(s => [...s, EMPTY_SECTION()])}
            style={{ width: '100%', background: '#0d0d0d', border: '2px dashed #1a1a1a', borderRadius: 12, padding: '12px', color: '#484848', fontSize: 13, cursor: 'pointer', fontWeight: 700, ...F }}>
            + 섹션 추가
          </button>
        </>
      )}

      {/* ── 미리보기 ── */}
      {preview && (
        <div>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: 2, fontWeight: 700, marginBottom: 16, ...F }}>PREVIEW</div>
          {sections.filter(s => s.nameKo).map(sec => (
            <div key={sec.id} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#c8a96e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 14, background: '#c8a96e', borderRadius: 2 }} />
                {sec.nameKo}
              </div>
              {sec.menus.filter(m => m.nameKo).map(menu => {
                const fc = foodCategories.find(f => f.id === menu.foodCategoryId)
                return (
                  <div key={menu.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 10, padding: '10px 14px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, ...F }}>{menu.nameKo}</span>
                        {menu.nameEn && <span style={{ fontSize: 10, color: '#666', marginLeft: 8, ...F }}>{menu.nameEn}</span>}
                        {fc && <span style={{ fontSize: 10, color: '#6fcf97', marginLeft: 8, background: '#1a2a1a', borderRadius: 6, padding: '2px 6px', ...F }}>{fc.group_emoji} {fc.name_ko}</span>}
                      </div>
                      {menu.price && <span style={{ color: '#c8a96e', fontWeight: 700, fontSize: 12, ...F }}>{Number(menu.price).toLocaleString()}원</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
