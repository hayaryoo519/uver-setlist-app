import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { PARTICIPANT_ROLES } from '../../types/liveMetadata';
import type { LiveArtist, ParticipantAssignment, ParticipantRole } from '../../types/liveMetadata';

/** 辞書の変更と、公演への関連付けの保存は別操作。名前だけで自動統合しない。 */
export default function CollaboratorsEditor({ items, artists, onChange, onArtistSaved, onBusyChange }: {
    items: ParticipantAssignment[]; artists: LiveArtist[];
    onChange: (items: ParticipantAssignment[]) => void; onArtistSaved: (artist: LiveArtist) => void;
    onBusyChange: (busy: boolean) => void;
}) {
    const [known, setKnown] = useState<Record<number, LiveArtist>>({});
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<LiveArtist[]>([]);
    const [selected, setSelected] = useState<LiveArtist | null>(null);
    const [role, setRole] = useState<ParticipantRole>('co_headliner');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [form, setForm] = useState<{ id?: number; revision?: number; name: string; aliases: string } | null>(null);
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
    useEffect(() => { setKnown(previous => ({ ...previous, ...Object.fromEntries(artists.map(artist => [artist.id, artist])) })); }, [artists]);
    const lookup = async () => {
        setBusy(true); setError(''); setNotice('');
        try {
            const value = await apiClient.get<LiveArtist[]>(`/api/live-artists?search=${encodeURIComponent(search)}`);
            if (alive.current) { setResults(value); setKnown(previous => ({ ...previous, ...Object.fromEntries(value.map(artist => [artist.id, artist])) })); }
        } catch (err) { if (alive.current) setError(`辞書検索に失敗しました：${(err as Error).message}`); }
        finally { if (alive.current) setBusy(false); }
    };
    const saveArtist = async () => {
        if (!form || busy) return;
        setBusy(true); setError(''); setNotice('');
        try {
            const body = { name: form.name, aliases: form.aliases.split('\n').map(value => value.trim()).filter(Boolean) };
            const artist = form.id ? await apiClient.patch<LiveArtist>(`/api/live-artists/${form.id}`, { ...body, revision: form.revision })
                : await apiClient.post<LiveArtist>('/api/live-artists', body);
            if (!alive.current) return;
            setKnown(previous => ({ ...previous, [artist.id]: artist }));
            setResults(previous => [...previous.filter(value => value.id !== artist.id), artist]);
            setSelected(artist); setForm(null);
            setNotice('アーティスト辞書を保存しました。公演への登録は役割を選んで追加し、最後に追加情報を保存してください。');
            onArtistSaved(artist);
        } catch (err) { if (alive.current) setError(`辞書を保存できませんでした：${(err as Error).message}。重複・競合時は再検索して既存情報を確認してください。`); }
        finally { if (alive.current) setBusy(false); }
    };
    const add = () => {
        if (!selected) return;
        if (items.some(item => item.artistId === selected.id && item.role === role)) { setError('同じアーティスト・役割は登録済みです。'); return; }
        if (items.length >= 30) { setError('共演情報は30件までです。'); return; }
        onChange([...items, { artistId: selected.id, role }]); setError('');
    };
    return <section aria-label="共演者辞書と関連付け">
        <p className="metadata-hint">フェスの全出演者を対バン相手にしません。対バン相手の確定は対バンタグの根拠になるため、タグの除外とは両立しません。未選択で確認済み保存すると「共演者なし」です。辞書の登録・修正は即時保存され、モーダルを閉じても取り消されません。</p>
        {busy && <p role="status">アーティスト辞書を処理中…</p>}
        {error && <p role="alert" className="metadata-error">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <ul>{items.map(item => <li key={`${item.artistId}:${item.role}`}>
            {known[item.artistId]?.name || `アーティストID ${item.artistId}`}
            <select aria-label={`共演者${item.artistId}の${item.role}の役割`} value={item.role} disabled={busy} onChange={event => {
                const nextRole = event.target.value as ParticipantRole;
                if (items.some(value => value.artistId === item.artistId && value.role === nextRole && value.role !== item.role)) { setError('同じアーティスト・役割は登録済みです。'); return; }
                onChange(items.map(value => value === item ? { ...value, role: nextRole } : value)); setError('');
            }}>{PARTICIPANT_ROLES.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}</select>
            <button type="button" aria-label={`共演者${item.artistId}の${item.role}を削除`} onClick={() => onChange(items.filter(value => value.artistId !== item.artistId || value.role !== item.role))}>削除</button>
        </li>)}</ul>
        <label>共演アーティストを検索<input value={search} maxLength={200} onChange={event => setSearch(event.target.value)} /></label>
        <button type="button" disabled={busy} onClick={lookup}>アーティストを検索</button>
        {results.length > 0 && <ul>{results.map(artist => <li key={artist.id}>
            <button type="button" disabled={busy} onClick={() => { setSelected(artist); setForm(null); }}>{artist.name}を選択</button>
            <span className="metadata-hint"> {artist.aliases.join(' / ')}</span>
        </li>)}</ul>}
        {selected && <div>
            <p>選択中：{selected.name}</p>
            <label>共演の役割<select value={role} onChange={event => setRole(event.target.value as ParticipantRole)}>
                {PARTICIPANT_ROLES.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}
            </select></label>
            <button type="button" disabled={busy} onClick={add}>共演者を追加</button>
            <button type="button" disabled={busy} onClick={() => setForm({ id: selected.id, revision: selected.revision, name: selected.name, aliases: selected.aliases.join('\n') })}>選択アーティストの辞書を修正</button>
        </div>}
        <button type="button" disabled={busy} onClick={() => setForm({ name: search, aliases: '' })}>新しいアーティストを登録</button>
        {form && <div>
            <label>アーティスト正式名<input value={form.name} maxLength={200} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
            <label>アーティスト別名（1行に1つ）<textarea value={form.aliases} onChange={event => setForm({ ...form, aliases: event.target.value })} /></label>
            <button type="button" disabled={busy || !form.name.trim()} onClick={saveArtist}>アーティスト辞書を保存</button>
            <button type="button" disabled={busy} onClick={() => setForm(null)}>辞書編集を取り消す</button>
        </div>}
    </section>;
}
