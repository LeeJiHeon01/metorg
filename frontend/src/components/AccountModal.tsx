import { useState } from 'react'
import { api } from '../api'
import { useUser } from '../lib/user'
import { useToast } from '../lib/toast'
import Modal from './Modal'

export default function AccountModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useUser()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!user) return
    setSaving(true)
    try {
      // 이름 변경
      if (name.trim() && name.trim() !== user.name) {
        const u = await api.updateProfile(user.id, name.trim())
        setUser({ ...user, name: u.name })
      }
      // 비밀번호 변경 (입력했을 때만)
      if (curPw || newPw) {
        if (!curPw || !newPw) {
          toast('현재/새 비밀번호를 모두 입력하세요', 'err')
          setSaving(false)
          return
        }
        await api.changePassword(user.id, curPw, newPw)
        setCurPw('')
        setNewPw('')
      }
      toast('계정 정보를 저장했어요', 'ok')
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : '저장 실패', 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="계정 설정"
      subtitle={user?.username ? `아이디: ${user.username}` : undefined}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : '저장'}
          </button>
          <button className="btn btn-soft" onClick={onClose}>
            취소
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">이름 (표시명)</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="label" style={{ marginTop: 6, marginBottom: 8 }}>비밀번호 변경 (선택)</div>
      <div className="field">
        <input
          className="input"
          type="password"
          value={curPw}
          onChange={(e) => setCurPw(e.target.value)}
          placeholder="현재 비밀번호"
        />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <input
          className="input"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="새 비밀번호"
        />
      </div>
    </Modal>
  )
}
