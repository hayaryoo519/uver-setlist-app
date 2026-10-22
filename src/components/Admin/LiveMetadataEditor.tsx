import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../lib/apiClient';
import { MEMBERS, METADATA_TAGS } from '../../types/liveMetadata';
import type { LiveMetadata, MemberId, MetadataOverrides, MetadataPatch, MetadataTag, ParticipantAssignment } from '../../types/liveMetadata';
import './LiveMetadataEditor.css';
import CollaboratorsEditor from './CollaboratorsEditor';
import { PARTICIPANT_ROLES } from '../../types/liveMetadata';

type TagMode = 'auto' | 'add' | 'remove';
type Draft = {
    tags: Record<MetadataTag, TagMode>;
    countryMode: 'auto' | 'confirmed'; countryCode: string;
    membersMode: 'auto' | 'confirmed'; memberIds: MemberId[];
    participantsMode: 'auto' | 'confirmed'; participants: ParticipantAssignment[];
    classificationManual: boolean; needsReview: boolean; note: string;
};
const draftFrom = (data: LiveMetadata): Draft => ({
    tags: Object.fromEntries(METADATA_TAGS.map(tag => [tag.id,
        data.overrides.tagOverrides?.add.includes(tag.id) ? 'add' :
            data.overrides.tagOverrides?.remove.includes(tag.id) ? 'remove' : 'auto',
    ])) as Record<MetadataTag, TagMode>,
    countryMode: data.overrides.country ? 'confirmed' : 'auto',
    countryCode: data.overrides.country?.code || data.candidates.countryCode || '',
    membersMode: data.overrides.members ? 'confirmed' : 'auto',
    memberIds: data.overrides.members?.ids || [],
    participantsMode: data.overrides.participants ? 'confirmed' : 'auto',
    participants: data.overrides.participants?.items || [],
    classificationManual: !!data.overrides.classification,
    needsReview: data.overrides.classification?.needsReview || false,
    note: data.overrides.classification?.note || '',
});
const tagNames = (tags: readonly string[] = []) => tags.map(id =>
    id === 'overseas' ? '海外公演' : METADATA_TAGS.find(tag => tag.id === id)?.label || id).join('、') || 'なし';
const safeSourceUrl = (value?: string | null) => {
    try { const url = new URL(value || ''); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
};

export default function LiveMetadataEditor({ liveId, liveTitle, onClose, onSaved, onArtistSaved }: {
    liveId: number; liveTitle: string; onClose: () => void; onSaved: () => void; onArtistSaved?: () => void;
}) {
    const [data, setData] = useState<LiveMetadata | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [dirty, setDirty] = useState<(keyof MetadataOverrides)[]>([]);
    const [loading, setLoading] = useState(true);
    const [readFailed, setReadFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [artistBusy, setArtistBusy] = useState(false);
    const [conflict, setConflict] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [reload, setReload] = useState(0);
    const root = useRef<HTMLDivElement>(null);
    const close = useRef<HTMLButtonElement>(null);
    const headingId = useId();

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        close.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            previous?.focus({ preventScroll: true });
        };
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setReadFailed(false); setError(''); setMessage('');
        apiClient.get<LiveMetadata>(`/api/lives/${liveId}/metadata`, { signal: controller.signal })
            .then(value => {
                if (controller.signal.aborted) return;
                setData(value); setDraft(draftFrom(value)); setDirty([]); setConflict(false);
            })
            .catch(err => { if (!controller.signal.aborted) { setReadFailed(true); setError(`追加情報を取得できませんでした：${err.message}`); } })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [liveId, reload]);

    const mark = (key: keyof MetadataOverrides) => {
        setDirty(previous => previous.includes(key) ? previous : [...previous, key]);
        setMessage('');
    };
    const requestClose = () => {
        if (saving || artistBusy) return;
        if (dirty.length && !window.confirm('未保存の変更を破棄して閉じますか？')) return;
        onClose();
    };
    const reloadData = () => {
        if (saving || artistBusy) return;
        if (dirty.length && !window.confirm('未保存の変更を破棄して最新情報を読み込みますか？')) return;
        setReload(value => value + 1);
    };
    const handleKeyboard = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); requestClose(); }
        if (event.key !== 'Tab') return;
        const elements = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary') || [])
            .filter(element => !element.closest('fieldset:disabled') &&
                (!element.closest('details:not([open])') || element.matches('summary')));
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!data || !draft || loading || readFailed || saving || artistBusy || conflict || !dirty.length) return;
        const patch: MetadataPatch = {};
        if (dirty.includes('tagOverrides')) {
            const add = METADATA_TAGS.filter(tag => draft.tags[tag.id] === 'add').map(tag => tag.id);
            const remove = METADATA_TAGS.filter(tag => draft.tags[tag.id] === 'remove').map(tag => tag.id);
            patch.tagOverrides = add.length || remove.length ? { add, remove } : null;
        }
        if (dirty.includes('country')) patch.country = draft.countryMode === 'auto' ? null : { code: draft.countryCode.trim().toUpperCase() };
        if (dirty.includes('members')) patch.members = draft.membersMode === 'auto' ? null : { ids: draft.memberIds };
        if (dirty.includes('participants')) patch.participants = draft.participantsMode === 'auto' ? null : { items: draft.participants };
        if (dirty.includes('classification')) patch.classification = draft.classificationManual
            ? { needsReview: draft.needsReview, note: draft.note.trim() || null } : null;
        setSaving(true); setError(''); setMessage('');
        try {
            const value = await apiClient.patch<LiveMetadata>(`/api/lives/${liveId}/metadata`, { revision: data.revision, patch });
            setData(value); setDraft(draftFrom(value)); setDirty([]); setMessage('追加情報を保存しました。');
            onSaved();
        } catch (err) {
            const failure = err as { status?: number; message: string };
            if (failure.status === 409) {
                setConflict(true);
                setError('別の更新が行われました。入力は保持しています。再読み込みして内容を確認してください。');
            } else setError(`保存できませんでした：${failure.message}`);
        } finally { setSaving(false); }
    };

    // 親ページのtransform/animationがfixedの包含ブロックになるのを避ける。
    return createPortal(
        <div className="modal-overlay metadata-overlay">
            <div ref={root} className="modal-content metadata-editor" role="dialog" aria-modal="true" aria-labelledby={headingId} onKeyDown={handleKeyboard}>
                <div className="metadata-editor-header">
                    <h2 id={headingId}>ライブ追加情報の確認・修正</h2>
                    <button ref={close} type="button" onClick={requestClose} disabled={saving || artistBusy} aria-label="追加情報を閉じる">閉じる</button>
                </div>
                <p>{liveTitle}</p>
                <p className="metadata-hint">公演名・特記事項・セトリは変更しません。保存した有効情報は公開一覧・詳細・検索に反映されます。共演者は登録済みアーティストと役割で管理します。</p>
                {error && <p role="alert" className="metadata-error">{error}</p>}
                {message && <p role="status">{message}</p>}
                <button type="button" onClick={reloadData} disabled={loading || saving || artistBusy}>最新情報を再読み込み</button>
                {loading && <p role="status">追加情報を読み込み中…</p>}
                {!loading && data && draft && (
                    <>
                        <section aria-label="取得候補と保存済み情報">
                            <h3>現在の有効情報</h3>
                            <p>タグ：{tagNames(data.effective.tags)}</p>
                            <p>開催国：{data.effective.country.code || '未確認'}（{data.effective.country.status === 'confirmed' ? '確認済み' : '未確認'}）</p>
                            <p>対象メンバー：{data.effective.members.status === 'unreviewed' ? '未確認' : data.effective.members.ids.map(id => MEMBERS.find(member => member.id === id)?.label || id).join('、') || '対象なし'}（{data.effective.members.status === 'confirmed' ? '確認済み' : '未確認'}）</p>
                            <p>共演者：{data.effective.participants?.status !== 'confirmed' ? '未確認' : data.effective.participants.items.map(item =>
                                `${data.artists?.find(artist => artist.id === item.artistId)?.name || `ID ${item.artistId}`}（${PARTICIPANT_ROLES.find(role => role.id === item.role)?.label}）`).join('、') || '共演者なし・確認済み'}</p>
                            <h3>自動候補（未確認）</h3>
                            <p>タグ候補：{tagNames(data.candidates.tags)}</p>
                            <p>開催国候補：{data.candidates.countryCode || '未取得'}</p>
                            <p>対象メンバー候補：{data.candidates.memberIds?.map(id => MEMBERS.find(member => member.id === id)?.label || id).join('、') || '未取得'}</p>
                            {data.candidates.conflicts?.map(item => <p key={item.field} className="metadata-error">取得元の不一致：{item.field === 'countryCode' ? '開催国' : item.field} — {item.values.join(' / ')}</p>)}
                            {Object.entries(data.candidates.sources || (data.candidates.sourceId ? { [data.candidates.sourceId]: data.candidates } : {})).map(([id, source]) => {
                                const url = safeSourceUrl(source.sourceUrl);
                                return <details key={id} className="metadata-source">
                                    <summary>取得元：{id}</summary>
                                    <p>属性候補：{tagNames(source.tags)} / 国候補：{source.countryCode || '未取得'}</p>
                                    {url && <a href={url} target="_blank" rel="noopener noreferrer">出典を開く</a>}
                                    <pre>{JSON.stringify(source.original || {}, null, 2)}</pre>
                                </details>;
                            })}
                        </section>
                        <form onSubmit={save}>
                            <fieldset disabled={loading || readFailed || saving || artistBusy || conflict}>
                                <legend>手動設定</legend>
                                <h3>タグ</h3>
                                <p className="metadata-hint">「自動」は候補に従います。「付ける／除外」は再取得でも維持されます。</p>
                                <div className="metadata-tag-grid">
                                    {METADATA_TAGS.map(tag => <label key={tag.id}>{tag.label}
                                        <select value={draft.tags[tag.id]} onChange={event => {
                                            setDraft({ ...draft, tags: { ...draft.tags, [tag.id]: event.target.value as TagMode } }); mark('tagOverrides');
                                        }}>
                                            <option value="auto">自動候補に従う</option><option value="add">付ける</option><option value="remove">除外する</option>
                                        </select>
                                    </label>)}
                                </div>
                                <button type="button" onClick={() => { setDraft({ ...draft, tags: draftFrom({ ...data, overrides: {} }).tags }); mark('tagOverrides'); }}>タグをすべて自動候補へ戻す</button>
                                <h3>開催国</h3>
                                <label>開催国の確認状態<select value={draft.countryMode} onChange={event => { setDraft({ ...draft, countryMode: event.target.value as Draft['countryMode'] }); mark('country'); }}>
                                    <option value="auto">未確認／自動候補へ戻す</option><option value="confirmed">開催国を確認済みにする</option>
                                </select></label>
                                {draft.countryMode === 'confirmed' && <label>開催国コード<input value={draft.countryCode} required pattern="[A-Za-z]{2}" maxLength={2} placeholder="JP / KR / TW" onChange={event => { setDraft({ ...draft, countryCode: event.target.value.toUpperCase() }); mark('country'); }} /></label>}
                                <h3>生誕祭の対象メンバー</h3>
                                <label>対象メンバーの確認状態<select value={draft.membersMode} onChange={event => { setDraft({ ...draft, membersMode: event.target.value as Draft['membersMode'] }); mark('members'); }}>
                                    <option value="auto">未確認／自動候補へ戻す</option><option value="confirmed">対象を確認済みにする</option>
                                </select></label>
                                {draft.membersMode === 'confirmed' && <div>
                                    <p className="metadata-hint">未選択で保存すると「対象なしと確認済み」です。メンバー確定は生誕祭の根拠になるため、生誕祭の除外と同時には保存できません。</p>
                                    {MEMBERS.map(member => <label className="metadata-check" key={member.id}><input type="checkbox" checked={draft.memberIds.includes(member.id)} onChange={event => {
                                        setDraft({ ...draft, memberIds: event.target.checked ? [...draft.memberIds, member.id] : draft.memberIds.filter(id => id !== member.id) }); mark('members');
                                    }} />{member.label}</label>)}
                                </div>}
                                <h3>共演者</h3>
                                <label>共演者の確認状態<select value={draft.participantsMode} onChange={event => {
                                    setDraft({ ...draft, participantsMode: event.target.value as Draft['participantsMode'] }); mark('participants');
                                }}>
                                    <option value="auto">未確認／自動候補へ戻す</option><option value="confirmed">共演者を確認済みにする</option>
                                </select></label>
                                {draft.participantsMode === 'confirmed' && <CollaboratorsEditor
                                    items={draft.participants} artists={data.artists || []} onBusyChange={setArtistBusy}
                                    onChange={items => { setDraft({ ...draft, participants: items }); mark('participants'); }}
                                    onArtistSaved={artist => {
                                        setData(previous => previous ? { ...previous, artists: [...(previous.artists || []).filter(value => value.id !== artist.id), artist] } : previous);
                                        onArtistSaved?.();
                                    }} />}
                                <h3>分類の検討メモ</h3>
                                <label className="metadata-check"><input type="checkbox" checked={draft.needsReview} onChange={event => { setDraft({ ...draft, classificationManual: true, needsReview: event.target.checked }); mark('classification'); }} />既存分類に収まらない・分類検討が必要</label>
                                <label>管理用メモ<textarea value={draft.note} maxLength={2000} onChange={event => { setDraft({ ...draft, classificationManual: true, note: event.target.value }); mark('classification'); }} /></label>
                                <button type="button" onClick={() => { setDraft({ ...draft, classificationManual: false, needsReview: false, note: '' }); mark('classification'); }}>分類検討の手動設定を解除</button>
                            </fieldset>
                            <div className="modal-actions"><button type="submit" className="btn-primary" disabled={saving || artistBusy || conflict || loading || readFailed || !dirty.length}>{saving ? '保存中…' : '追加情報を保存'}</button></div>
                        </form>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
