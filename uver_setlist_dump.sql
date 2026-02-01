--
-- PostgreSQL database dump
--

\restrict ZpoM4e5r5MC8UNuc0a5eEefOtYlviXqhF1Ao37pwPWjf3yWK9b1jmMUZgLRrbBZ

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.setlists DROP CONSTRAINT IF EXISTS setlists_song_id_fkey;
ALTER TABLE IF EXISTS ONLY public.setlists DROP CONSTRAINT IF EXISTS setlists_live_id_fkey;
ALTER TABLE IF EXISTS ONLY public.corrections DROP CONSTRAINT IF EXISTS corrections_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.corrections DROP CONSTRAINT IF EXISTS corrections_reviewed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.corrections DROP CONSTRAINT IF EXISTS corrections_live_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance DROP CONSTRAINT IF EXISTS attendance_live_id_fkey;
DROP INDEX IF EXISTS public.songs_title_idx;
DROP INDEX IF EXISTS public.idx_security_logs_timestamp;
DROP INDEX IF EXISTS public.idx_security_logs_event_type;
DROP INDEX IF EXISTS public.idx_corrections_user_id;
DROP INDEX IF EXISTS public.idx_corrections_status;
DROP INDEX IF EXISTS public.idx_corrections_live_id;
DROP INDEX IF EXISTS public.idx_corrections_created_at;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.songs DROP CONSTRAINT IF EXISTS songs_title_key;
ALTER TABLE IF EXISTS ONLY public.songs DROP CONSTRAINT IF EXISTS songs_pkey;
ALTER TABLE IF EXISTS ONLY public.setlists DROP CONSTRAINT IF EXISTS setlists_pkey;
ALTER TABLE IF EXISTS ONLY public.security_logs DROP CONSTRAINT IF EXISTS security_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.lives DROP CONSTRAINT IF EXISTS lives_pkey;
ALTER TABLE IF EXISTS ONLY public.corrections DROP CONSTRAINT IF EXISTS corrections_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance DROP CONSTRAINT IF EXISTS attendance_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.songs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.setlists ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.security_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lives ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.corrections ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.songs_id_seq;
DROP TABLE IF EXISTS public.songs;
DROP SEQUENCE IF EXISTS public.setlists_id_seq;
DROP TABLE IF EXISTS public.setlists;
DROP SEQUENCE IF EXISTS public.security_logs_id_seq;
DROP TABLE IF EXISTS public.security_logs;
DROP SEQUENCE IF EXISTS public.lives_id_seq;
DROP TABLE IF EXISTS public.lives;
DROP SEQUENCE IF EXISTS public.corrections_id_seq;
DROP TABLE IF EXISTS public.corrections;
DROP TABLE IF EXISTS public.attendance;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    user_id integer NOT NULL,
    live_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: corrections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.corrections (
    id integer NOT NULL,
    user_id integer NOT NULL,
    live_id integer,
    live_date text,
    live_venue text,
    live_title text,
    correction_type text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp without time zone,
    reviewed_by integer,
    admin_note text,
    suggested_data jsonb
);


ALTER TABLE public.corrections OWNER TO postgres;

--
-- Name: corrections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.corrections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.corrections_id_seq OWNER TO postgres;

--
-- Name: corrections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.corrections_id_seq OWNED BY public.corrections.id;


--
-- Name: lives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lives (
    id integer NOT NULL,
    date date NOT NULL,
    venue character varying(255) NOT NULL,
    title character varying(255),
    tour_name character varying(255),
    type character varying(50),
    prefecture character varying(50),
    special_note character varying(255)
);


ALTER TABLE public.lives OWNER TO postgres;

--
-- Name: lives_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lives_id_seq OWNER TO postgres;

--
-- Name: lives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lives_id_seq OWNED BY public.lives.id;


--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_logs (
    id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now(),
    event_type character varying(50) NOT NULL,
    message text,
    user_email character varying(255),
    ip_address character varying(45),
    details jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.security_logs OWNER TO postgres;

--
-- Name: security_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.security_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_logs_id_seq OWNER TO postgres;

--
-- Name: security_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.security_logs_id_seq OWNED BY public.security_logs.id;


--
-- Name: setlists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.setlists (
    id integer NOT NULL,
    live_id integer,
    song_id integer,
    "position" integer,
    note character varying(255)
);


ALTER TABLE public.setlists OWNER TO postgres;

--
-- Name: setlists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.setlists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.setlists_id_seq OWNER TO postgres;

--
-- Name: setlists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.setlists_id_seq OWNED BY public.setlists.id;


--
-- Name: songs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.songs (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    album character varying(255),
    release_year integer,
    mv_url character varying(255),
    author character varying(255)
);


ALTER TABLE public.songs OWNER TO postgres;

--
-- Name: songs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.songs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.songs_id_seq OWNER TO postgres;

--
-- Name: songs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.songs_id_seq OWNED BY public.songs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(255),
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_verified boolean DEFAULT false,
    verification_token text,
    reset_password_token character varying(255),
    reset_password_expires bigint
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: corrections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corrections ALTER COLUMN id SET DEFAULT nextval('public.corrections_id_seq'::regclass);


--
-- Name: lives id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lives ALTER COLUMN id SET DEFAULT nextval('public.lives_id_seq'::regclass);


--
-- Name: security_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_logs ALTER COLUMN id SET DEFAULT nextval('public.security_logs_id_seq'::regclass);


--
-- Name: setlists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setlists ALTER COLUMN id SET DEFAULT nextval('public.setlists_id_seq'::regclass);


--
-- Name: songs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.songs ALTER COLUMN id SET DEFAULT nextval('public.songs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (user_id, live_id, created_at) FROM stdin;
27	610	2026-01-26 12:53:00.936666
27	611	2026-01-26 12:53:02.312665
27	633	2026-01-26 12:53:09.087738
27	632	2026-01-26 12:53:11.455471
27	748	2026-01-26 12:53:49.038524
27	898	2026-01-26 12:54:25.703159
27	899	2026-01-26 12:54:25.92067
27	1142	2026-01-26 12:54:41.514153
27	1023	2026-01-26 12:54:52.752165
27	1022	2026-01-26 12:54:50.702506
27	1164	2026-01-26 12:55:01.701199
27	1092	2026-01-26 12:55:47.301211
27	1017	2026-01-26 12:56:04.794935
27	1016	2026-01-26 12:56:05.941069
27	947	2026-01-26 12:56:17.450928
27	946	2026-01-26 12:56:18.522672
27	998	2026-01-26 12:57:01.78764
27	749	2026-01-26 12:57:40.651416
\.


--
-- Data for Name: corrections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.corrections (id, user_id, live_id, live_date, live_venue, live_title, correction_type, description, status, created_at, reviewed_at, reviewed_by, admin_note, suggested_data) FROM stdin;
\.


--
-- Data for Name: lives; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lives (id, date, venue, title, tour_name, type, prefecture, special_note) FROM stdin;
660	2025-02-05	KT Zepp Yokohama		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
659	2025-02-13	滋賀県立芸術劇場 びわ湖ホール		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	HALL	\N	
642	2025-03-25	Hiroshima CLUB QUATTRO		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
657	2025-02-17	Zepp Osaka Bayside		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
656	2025-02-18	Zepp Osaka Bayside		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
655	2025-02-21	Zepp Haneda (TOKYO)		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
646	2025-03-13	Zepp Nagoya		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
640	2025-04-05	さいたまスーパーアリーナ		現場至上主義 2025	FESTIVAL	\N	
603	2025-12-26	日本武道館	SEKAI NO OWARI	UVERworld VS シリーズ UVERworld vs SEKAI NO OWARI	EVENT	\N	VS シリーズ
654	2025-02-22	Zepp Haneda (TOKYO)		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	克哉 生誕祭
651	2025-03-03	長野CLUB JUNK BOX		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
650	2025-03-04	長野CLUB JUNK BOX		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
649	2025-03-07	Zepp Fukuoka		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
617	2025-11-09	幕張メッセ国際展示場 9-11ホール		LUNATIC FEST.2025 	FESTIVAL	\N	
643	2025-03-24	Hiroshima CLUB QUATTRO		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
644	2025-03-19	Zepp Sapporo		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
645	2025-03-18	Zepp Sapporo		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
647	2025-03-12	Zepp Nagoya		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
667	2024-12-25	日本武道館		NO ENEMY TOUR	ONEMAN	\N	PREMIUM LIVE on Xmas 2024
658	2025-02-14	滋賀県立芸術劇場 びわ湖ホール		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	HALL	\N	信人 生誕祭
641	2025-03-29	高雄駁二芸術特区		Megaport Festival 大港開唱	FESTIVAL	\N	
639	2025-04-19	舞鶴P.B.ハーバーパーク		MAIZURU PLAYBACK FES.2025	FESTIVAL	\N	
638	2025-04-20	舞鶴P.B.ハーバーパーク		MAIZURU PLAYBACK FES.2025	FESTIVAL	\N	
636	2025-05-11	海の森公園		METROCK 2025	FESTIVAL	\N	
635	2025-06-06	B-FLAT		UVERworld THE LIVE 2025	LIVEHOUSE	\N	
628	2025-08-11	さいたまスーパーアリーナ		CANNONBALL	FESTIVAL	\N	
624	2025-09-07	熊本県農業公園​カントリーパーク		WANIMA presents 1CHANCE FESTIVAL 2025	FESTIVAL	\N	
634	2025-06-11	渋谷eggman		UVERworld THE LIVE 2025	LIVEHOUSE	\N	
631	2025-07-06	Zepp Fukuoka		UVERworld THE LIVE 2025	LIVEHOUSE	\N	
630	2025-07-19	岩見沢公園		JOIN ALIVE 2025	FESTIVAL	\N	
629	2025-07-21	みずほPayPayドーム福岡		NUMBER SHOT2025	FESTIVAL	\N	
627	2025-08-24	讃岐まんのう公園		MONSTER baSH	FESTIVAL	\N	
620	2025-09-25	Zepp Sapporo		UVERworld THE LIVE 2025	ONEMAN	\N	誠果 生誕祭
622	2025-09-19	コーチャンフォー釧路文化ホール 大ホール		UVERworld THE LIVE 2025	HALL	\N	
623	2025-09-13	蘇我スポーツ公園		ROCK IN JAPAN FESTIVAL 2025	FESTIVAL	\N	
661	2024-12-31	マリンメッセ福岡		NO ENEMY TOUR	ONEMAN	\N	
662	2024-12-31	マリンメッセ福岡		NO ENEMY TOUR	ONEMAN	\N	
666	2024-12-25	日本武道館		NO ENEMY TOUR	ONEMAN	\N	
621	2025-09-24	Zepp Sapporo		UVERworld THE LIVE 2025	LIVEHOUSE	\N	
668	2024-12-21	横浜アリーナ		NO ENEMY TOUR	ONEMAN	\N	TAKUYA∞ 生誕祭
625	2025-09-05	柏PALOOZA		UVERworld THE LIVE 2025	LIVEHOUSE	\N	
626	2025-08-30	HARD OFF ECOスタジアム新潟		⾳楽と髭達2025-ONE NIGHT Rock'n Roll SHOW-	FESTIVAL	\N	
663	2024-12-30	マリンメッセ福岡		NO ENEMY TOUR	ONEMAN	\N	
664	2024-12-28	幕張メッセ国際展示場 1-3ホール		COUNTDOWN JAPAN 24/25	FESTIVAL	\N	
670	2024-12-08	高知県立県民文化ホール		NO ENEMY TOUR	HALL	\N	
671	2024-12-05	レクザムホール		NO ENEMY TOUR	HALL	\N	
672	2024-11-28	大阪城ホール		NO ENEMY TOUR	HALL	\N	
673	2024-11-27	大阪城ホール		NO ENEMY TOUR	HALL	\N	
674	2024-11-25	B-FLAT		Neo SOUND WAVE Crew Limited Live	EVENT	\N	
675	2024-11-22	釧路市民文化会館		NO ENEMY TOUR	HALL	\N	
676	2024-11-20	帯広市民文化ホール		NO ENEMY TOUR	HALL	\N	
605	2025-12-25	日本武道館		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	UVERworld PREMIUM LIVE on Xmas 2025
648	2025-03-08	Zepp Fukuoka		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	彰 生誕祭
665	2024-12-26	日本武道館		UVERworld VS シリーズ “UVERworld vs Official髭男dism	EVENT	\N	VS シリーズ
606	2025-12-21	横浜アリーナ		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	TAKUYA∞ 生誕祭
669	2024-12-20	横浜アリーナ		NO ENEMY TOUR	ONEMAN	\N	男祭りvs女祭り
600	2025-12-31	マリンメッセ福岡		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	
601	2025-12-30	マリンメッセ福岡		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	
602	2025-12-28	幕張メッセ国際展示場 1-3ホール		COUNTDOWN JAPAN 25/26	FESTIVAL	\N	
604	2025-12-25	日本武道館		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	
607	2025-12-20	横浜アリーナ		WINTER TOUR "BOOM GOES THE WORLD"	ARENA	\N	
608	2025-12-14	広島グリーンアリーナ		WINTER TOUR "BOOM GOES THE WORLD"	ARENA	\N	
609	2025-12-13	広島グリーンアリーナ		WINTER TOUR "BOOM GOES THE WORLD"	ARENA	\N	
610	2025-12-07	愛知県国際展示場		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	
611	2025-12-06	愛知県国際展示場		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	
612	2025-11-30	朱鷺メッセ		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	
613	2025-11-29	朱鷺メッセ		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	
614	2025-11-26	長野CLUB JUNK BOX		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	
615	2025-11-16	大阪城ホール		WINTER TOUR "BOOM GOES THE WORLD"	HALL	\N	
616	2025-11-15	大阪城ホール		WINTER TOUR "BOOM GOES THE WORLD"	HALL	\N	
632	2025-06-15	東京ドーム		LIVE “EPIPHANY” at TOKYO DOME	ARENA	\N	
633	2025-06-14	東京ドーム		LIVE “EPIPHANY” at TOKYO DOME	ARENA	\N	
637	2025-05-04	さいたまスーパーアリーナ		VIVA LA ROCK 2025	FESTIVAL	\N	
680	2024-11-03	ビッグハット		NO ENEMY TOUR	ONEMAN	\N	
681	2024-11-02	ビッグハット		NO ENEMY TOUR	ONEMAN	\N	
682	2024-10-20	サンアリーナ		NO ENEMY TOUR	ARENA	\N	
683	2024-10-19	サンアリーナ		NO ENEMY TOUR	ARENA	\N	
684	2024-10-09	かわしょうホール		NO ENEMY TOUR	HALL	\N	
685	2024-10-07	iichiko総合文化センター グランシアタ		NO ENEMY TOUR	ONEMAN	\N	
686	2024-10-05	倉敷市民会館		NO ENEMY TOUR	HALL	\N	
687	2024-10-03	とりぎん文化会館		NO ENEMY TOUR	HALL	\N	
694	2024-08-12	蘇我スポーツ公園		ROCK IN JAPAN FESTIVAL 2024	FESTIVAL	\N	
704	2024-05-03	さいたまスーパーアリーナ		VIVA LA ROCK 2024	FESTIVAL	\N	
707	2024-03-15	Zepp Sapporo		LIVE TOUR 2024	LIVEHOUSE	\N	
709	2024-03-08	Zepp Haneda (TOKYO)		LIVE TOUR 2024	EVENT	\N	彰 生誕祭
711	2024-03-04	Zepp Osaka Bayside		LIVE TOUR 2024	LIVEHOUSE	\N	
713	2024-02-28	Zepp Nagoya		LIVE TOUR 2024	LIVEHOUSE	\N	
719	2024-02-14	弘前市民会館		LIVE TOUR 2024	EVENT	\N	信人 生誕祭
720	2024-02-06	KT Zepp Yokohama		LIVE TOUR 2024	LIVEHOUSE	\N	
696	2024-07-21	みずほPayPayドーム福岡		NUMBER SHOT2024	FESTIVAL	\N	
715	2024-02-22	Zepp Fukuoka		LIVE TOUR 2024	ONEMAN	\N	克哉 生誕祭
732	2023-12-08	フェニックスプラザ		ENIGMASIS TOUR	ONEMAN	\N	
693	2024-08-16	石狩湾新港樽川ふ頭横野外特設ステージ		RISING SUN ROCK FESTIVAL 2024 in EZO	FESTIVAL	\N	
714	2024-02-27	ボトムライン		QUEEN'S PARTY TOUR 2024	ONEMAN	\N	女祭り
712	2024-03-02	OSAKA MUSE		QUEEN'S PARTY TOUR 2024	ONEMAN	\N	女祭り
733	2023-12-06	日本ガイシホール		ENIGMASIS TOUR	HALL	\N	
734	2023-12-05	日本ガイシホール		ENIGMASIS TOUR	HALL	\N	
710	2024-03-07	LIQUIDROOM		QUEEN'S PARTY TOUR 2024	ONEMAN	\N	女祭り
706	2024-04-11	Honolulu,USA The Republik	TOUR FINAL in HAWAII	QUEEN'S PARTY TOUR 2024	EVENT	\N	女祭り
716	2024-02-21	DRUM LOGOS		QUEEN'S PARTY TOUR 2024	ONEMAN	\N	女祭り
652	2025-02-28	仙台GIGS		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
653	2025-02-27	仙台GIGS		UVERworld LIVE TOUR 2025 〜EDGE POINT〜	LIVEHOUSE	\N	
619	2025-11-04	仙台GIGS		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	
677	2024-11-14	仙台GIGS		NO ENEMY TOUR	ONEMAN	\N	
678	2024-11-13	仙台GIGS		NO ENEMY TOUR	ONEMAN	\N	
717	2024-02-18	仙台GIGS		LIVE TOUR 2024	ONEMAN	\N	
727	2023-12-21	横浜アリーナ		ENIGMASIS TOUR	ONEMAN	\N	TAKUYA∞ 生誕祭
735	2023-11-30	愛媛県県民文化会館		ENIGMASIS TOUR	HALL	\N	
705	2024-04-29	舞鶴P.B.ハーバーパーク		MAIZURU PLAYBACK FES.2024	FESTIVAL	\N	
703	2024-05-05	蘇我スポーツ公園		JAPAN JAM 2024	FESTIVAL	\N	
702	2024-05-18	新木場若洲公園		TOKYO METROPOLITAN ROCK FESTIVAL 2024	FESTIVAL	\N	
691	2024-08-25	国営讃岐まんのう公園		MONSTER baSH 2024	FESTIVAL	\N	
700	2024-06-15	ぴあアリーナMM		UVERworld&CNBLUE SUMMER LIVE IN JAPAN and KOREA UNLIMITED CHALLENGE	EVENT	\N	&CNBLUE 
618	2025-11-05	仙台GIGS		WINTER TOUR "BOOM GOES THE WORLD"	ONEMAN	\N	真太郎 生誕祭
701	2024-06-06	Zepp Sapporo		UVERworld THE LIVE 〜toward 25&20 anniv.〜	LIVEHOUSE	\N	
699	2024-07-06	Zepp Osaka Bayside		UVERworld THE LIVE 〜toward 25&20 anniv.〜	LIVEHOUSE	\N	
697	2024-07-15	国立代々木競技場 第一体育館		J-WAVE presents INSPIRE TOKYO 2024 -Best Music & Market-	FESTIVAL	\N	
698	2024-07-13	岩見沢公園		JOIN ALIVE 2024	FESTIVAL	\N	
692	2024-08-24	熊本県農業公園 カントリーパーク		 WANIMA presents 1CHANCE FESTIVAL 2024	FESTIVAL	\N	
736	2023-11-26	静岡市民文化会館		ENIGMASIS TOUR	HALL	\N	
690	2024-09-14	幕張メッセ国際展示場 4-7ホール		テレビ朝日ドリームフェスティバル2024	FESTIVAL	\N	
689	2024-09-21	国営ひたち海浜公園		ROCK IN JAPAN FESTIVAL 2024 in HITACHINAKA	FESTIVAL	\N	
721	2024-01-07	東京ガーデンシアター		ANIPLEX 20th Anniversary Event -THANX-	EVENT	\N	株式会社アニプレックスの20周年を記念したライブエンターテインメントイベント
722	2023-12-31	マリンメッセ福岡		ENIGMASIS TOUR	ONEMAN	\N	
723	2023-12-31	マリンメッセ福岡		ENIGMASIS TOUR	ONEMAN	\N	
724	2023-12-30	マリンメッセ福岡		ENIGMASIS TOUR	ONEMAN	\N	
725	2023-12-25	日本武道館		ENIGMASIS TOUR	ONEMAN	\N	
728	2023-12-20	横浜アリーナ		ENIGMASIS TOUR	ARENA	\N	
730	2023-12-13	水戸市民会館		ENIGMASIS TOUR	HALL	\N	
731	2023-12-10	本多の森ホール		ENIGMASIS TOUR	HALL	\N	
737	2023-11-20	大宮ソニックシティ		ENIGMASIS TOUR	ONEMAN	\N	
739	2023-11-12	市民会館シアーズホーム夢ホール		ENIGMASIS TOUR	HALL	\N	
741	2023-10-29	大阪城ホール		ENIGMASIS TOUR	HALL	\N	
742	2023-10-28	大阪城ホール		ENIGMASIS TOUR	HALL	\N	
743	2023-10-24	周南市文化会館		ENIGMASIS TOUR	HALL	\N	
753	2023-07-01	幕張メッセ国際展示場		THE MUSIC DAY 2023	EVENT	\N	生放送
752	2023-07-06	Zepp Fukuoka		UVERworld Warm-Up GIG~Toward NISSAN STADIUM~	LIVEHOUSE	\N	
738	2023-11-15	Zepp Fukuoka		Creepy Nuts TWO MAN TOUR「生業」2023	EVENT	\N	ゲスト出演
751	2023-07-21	ミュージックステーション		MUSIC STATION	EVENT	\N	生放送
747	2023-09-03	熊本県農業公園​カントリーパーク		1CHANCE FESTIVAL 2023	FESTIVAL	\N	
744	2023-10-08	烏丸半島芝生広場		イナズマロック フェス 2023	FESTIVAL	\N	
729	2023-12-16	京都パルスプラザ		響都超特急2023 ～KYOTO ULTRA EXPRESS～	FESTIVAL	\N	
746	2023-09-10	さいたまスーパーアリーナ		SAMRISE Festival	FESTIVAL	\N	
679	2024-11-05	トーサイクラシックホール岩手		NO ENEMY TOUR	ONEMAN	\N	真太郎 生誕祭
688	2024-09-25	Zepp Nagoya		NO ENEMY TOUR	LIVEHOUSE	\N	誠果 生誕祭
708	2024-03-13	札幌ペニーレーン24		QUEEN'S PARTY TOUR 2024	ONEMAN	\N	女祭り
718	2024-02-17	仙台GIGS		QUEEN'S PARTY TOUR 2024	ONEMAN	\N	女祭り
740	2023-11-05	ミュージックタウン音市場		ENIGMASIS TOUR	ONEMAN	\N	真太郎 生誕祭
745	2023-09-25	Zepp Sapporo		ENIGMASIS TOUR	ONEMAN	\N	誠果 生誕祭
749	2023-07-29	日産スタジアム		UVERworld premium THE LIVE at NISSAN STADIUM	EVENT	\N	
755	2023-05-04	蘇我スポーツ公園		JAPAN JAM 2023	FESTIVAL	\N	
756	2023-05-03	さいたまスーパーアリーナ		VIVA LA ROCK 2023	FESTIVAL	\N	
748	2023-07-30	日産スタジアム		UVERworld KING’S PARADE 男祭りREBORN at NISSAN STADIUM　6 VS 72000	EVENT	\N	男祭り
775	2023-01-24	Zepp DiverCity (TOKYO)	act1	GLEAM OF ROCK	LIVEHOUSE	\N	
773	2023-02-09	KT Zepp Yokohama	act1	GLEAM OF ROCK	LIVEHOUSE	\N	
791	2022-11-05	Zepp Fukuoka	Night Live	THE LIVE	ONEMAN	\N	真太郎 生誕祭
765	2023-03-08	Zepp Osaka Bayside	act2	GLEAM OF ROCK	ONEMAN	\N	彰 生誕祭
793	2022-09-25	Zepp Haneda (TOKYO)	Night Live	THE LIVE	ONEMAN	\N	誠果 生誕祭
792	2022-09-25	Zepp Haneda (TOKYO)	Day Live	THE LIVE	ONEMAN	\N	誠果 生誕祭
772	2023-02-09	KT Zepp Yokohama	act2	GLEAM OF ROCK	LIVEHOUSE	\N	
774	2023-01-24	Zepp DiverCity (TOKYO)	act2	GLEAM OF ROCK	LIVEHOUSE	\N	
801	2022-07-06	Zepp Sapporo	Night Live	Warm-Up GIG 2022	LIVEHOUSE	\N	
802	2022-07-06	Zepp Sapporo	Day Live	Warm-Up GIG 2022	LIVEHOUSE	\N	
804	2022-06-06	Zepp Osaka Bayside	Night Live	Warm-Up GIG 2022	LIVEHOUSE	\N	
759	2023-03-28	Zepp Sapporo	act2	GLEAM OF ROCK	LIVEHOUSE	\N	
760	2023-03-28	Zepp Sapporo	act1	GLEAM OF ROCK	LIVEHOUSE	\N	
762	2023-03-22	仙台GIGS	act1	GLEAM OF ROCK	ONEMAN	\N	
761	2023-03-22	仙台GIGS	act2	GLEAM OF ROCK	ONEMAN	\N	
764	2023-03-13	Zepp Fukuoka	act1	GLEAM OF ROCK	LIVEHOUSE	\N	
763	2023-03-13	Zepp Fukuoka	act2	GLEAM OF ROCK	LIVEHOUSE	\N	
758	2023-04-12	横浜アリーナ		UVERworld VS シリーズ UVERworld vs BiSH	EVENT	\N	VS シリーズ
766	2023-03-08	Zepp Osaka Bayside	act1	GLEAM OF ROCK	ONEMAN	\N	彰 生誕祭
754	2023-06-06	仙台GIGS		UVERworld THE LIVE 230606	EVENT	\N	ALL FREE 200％
803	2022-06-06	Zepp Osaka Bayside	Day Live	Warm-Up GIG 2022	LIVEHOUSE	\N	
767	2023-03-04	Zepp Osaka Bayside		ROTTENGRAFFTY「Hello Zepp Tour 2023」	EVENT	\N	ゲスト出演
776	2022-12-31	マリンメッセ福岡		THE LIVE	ONEMAN	\N	
778	2022-12-30	マリンメッセ福岡		THE LIVE	ONEMAN	\N	
780	2022-12-25	日本武道館		THE LIVE	ONEMAN	\N	
782	2022-12-20	横浜アリーナ		THE LIVE	ARENA	\N	
783	2022-12-15	大阪城ホール		THE LIVE	HALL	\N	
784	2022-12-14	大阪城ホール		THE LIVE	HALL	\N	
787	2022-12-04	日本ガイシホール		THE LIVE	HALL	\N	
788	2022-12-03	日本ガイシホール		THE LIVE	HALL	\N	
789	2022-11-30	KT Zepp Yokohama		THE LIVE	LIVEHOUSE	\N	
796	2022-08-20	讃岐まんのう公園		MONSTER baSH 2022	FESTIVAL	\N	
797	2022-08-12	蘇我スポーツ公園		ROCK IN JAPAN FESTIVAL 2022	FESTIVAL	\N	
799	2022-07-21	日本武道館		THE LIVE	ONEMAN	\N	
800	2022-07-20	日本武道館		THE LIVE	ONEMAN	\N	
806	2022-05-04	さいたまスーパーアリーナ		VIVA LA ROCK 2022	FESTIVAL	\N	
807	2022-05-03	蘇我スポーツ公園		JAPAN JAM 2022	FESTIVAL	\N	
808	2022-03-25	仙台GIGS		LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	ONEMAN	\N	
811	2022-03-13	Zepp Haneda (TOKYO)		NOISEMAKER presents AXIS TOUR	EVENT	\N	ゲスト出演
805	2022-05-22	新木場若洲公園		METOROCK 2022	FESTIVAL	\N	
795	2022-09-04	つま恋リゾート 彩の郷		1CHANCE FESTIVAL 2022	EVENT	\N	
810	2022-03-24	仙台GIGS	Night Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	ONEMAN	\N	
785	2022-12-09	仙台GIGS	Night Live	THE LIVE	ONEMAN	\N	
786	2022-12-09	仙台GIGS	Day Live	THE LIVE	ONEMAN	\N	
809	2022-03-24	仙台GIGS	Day Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	ONEMAN	\N	
750	2023-07-25	duo MUSIC EXCHANGE	duo 20th Anniversary Live	UVERworld Warm-Up GIG~Toward NISSAN STADIUM~	ONEMAN	\N	Neo SOUND Crew限定ライブ
794	2022-09-18	唐船半島芝生広場		イナズマロック フェス 2022	FESTIVAL	\N	
757	2023-04-13	横浜アリーナ		UVERworld VS シリーズ UVERworld vs BiSH	EVENT	\N	VS シリーズ
726	2023-12-25	日本武道館		ENIGMASIS TOUR	ONEMAN	\N	PREMIUM LIVE on Xmas 2023 at Nippon Budokan
779	2022-12-25	日本武道館		THE LIVE	ONEMAN	\N	Premium Live on Xmas 2022
781	2022-12-21	横浜アリーナ		THE LIVE	ONEMAN	\N	TAKUYA∞ 生誕祭
798	2022-08-09	duo MUSIC EXCHANGE		THE LIVE	ONEMAN	\N	Neo SOUND Crew Only
769	2023-02-22	Hiroshima CLUB QUATTRO	act2	GLEAM OF ROCK	ONEMAN	\N	克哉 生誕祭
768	2023-02-22	Hiroshima CLUB QUATTRO	act1	GLEAM OF ROCK	ONEMAN	\N	克哉 生誕祭
771	2023-02-14	Zepp Nagoya	act2	GLEAM OF ROCK	ONEMAN	\N	信人 生誕祭
770	2023-02-14	Zepp Nagoya	act1	GLEAM OF ROCK	ONEMAN	\N	信人 生誕祭
790	2022-11-05	Zepp Fukuoka	Day Live	THE LIVE	ONEMAN	\N	真太郎 生誕祭
815	2022-03-02	Zepp Fukuoka		LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
818	2022-02-22	Zepp Nagoya		LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	EVENT	\N	克哉 生誕祭
821	2022-02-14	Zepp Sapporo		LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	EVENT	\N	信人 生誕祭
824	2022-02-09	Zepp Osaka Bayside		LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
827	2022-02-01	KT Zepp Yokohama		LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
830	2021-12-31	マリンメッセ福岡		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	ONEMAN	\N	
831	2021-12-31	マリンメッセ福岡		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	ONEMAN	\N	
832	2021-12-30	マリンメッセ福岡		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	ONEMAN	\N	
833	2021-12-30	マリンメッセ福岡		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	ONEMAN	\N	
834	2021-12-25	日本武道館		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	EVENT	\N	Xmas
835	2021-12-25	日本武道館		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	EVENT	\N	Xmas
836	2021-12-24	Makuhari Event Hall		Music Station Ultra Super Live 2021	HALL	\N	
837	2021-12-21	横浜アリーナ		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	EVENT	\N	TAKUYA∞ 生誕祭
838	2021-12-21	横浜アリーナ		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	EVENT	\N	TAKUYA∞ 生誕祭
839	2021-12-20	横浜アリーナ		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	ARENA	\N	
840	2021-12-20	横浜アリーナ		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	ARENA	\N	
841	2021-11-26	MAIRO		POWER OF GIG 2021	ONEMAN	\N	
842	2021-11-26	MAIRO		POWER OF GIG 2021	ONEMAN	\N	
843	2021-11-25	SUNDOME FUKUI		SUNDOME FUKUI Event	ARENA	\N	
844	2021-11-18	朱鷺メッセ		Toki Messe Event	EVENT	\N	
845	2021-11-17	長野CLUB JUNK BOX		POWER OF GIG 2021	ONEMAN	\N	
846	2021-11-17	長野CLUB JUNK BOX		POWER OF GIG 2021	ONEMAN	\N	
847	2021-11-05	横浜アリーナ		YOKOHAMA ARENA Event	EVENT	\N	真太郎 生誕祭
848	2021-10-29	Hiroshima CLUB QUATTRO		POWER OF GIG 2021	ONEMAN	\N	
849	2021-10-29	Hiroshima CLUB QUATTRO		POWER OF GIG 2021	ONEMAN	\N	
850	2021-10-27	大阪城ホール		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	HALL	\N	
851	2021-10-27	大阪城ホール		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	HALL	\N	
852	2021-10-26	大阪城ホール		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	HALL	\N	
853	2021-10-26	大阪城ホール		ARENA LIVE 2021 ~ THE DAWN WILL BREAK ~	HALL	\N	
854	2021-09-25	UNIT		UVERworld POWER OF GIG 0925	EVENT	\N	誠果 生誕祭
855	2021-09-25	UNIT		UVERworld POWER OF GIG 0925	EVENT	\N	誠果 生誕祭
856	2021-09-05	横浜アリーナ		UVERworldLIVE 2021at Yokohama Arena ~ We gonna go ~	ARENA	\N	
857	2021-09-05	横浜アリーナ		UVERworldLIVE 2021at Yokohama Arena ~ We gonna go ~	ARENA	\N	
858	2021-09-04	横浜アリーナ		UVERworldLIVE 2021at Yokohama Arena ~ We gonna go ~	ARENA	\N	
859	2021-09-04	横浜アリーナ		UVERworldLIVE 2021at Yokohama Arena ~ We gonna go ~	ARENA	\N	
860	2021-08-20	ミュージックステーション		Music Station Event	EVENT	\N	
861	2021-06-13	横浜アリーナ		UVERworld Premium Live 2021 at Yokohama Arena	ARENA	\N	
862	2021-06-13	横浜アリーナ		UVERworld Premium Live 2021 at Yokohama Arena	ARENA	\N	
863	2021-06-12	横浜アリーナ		UVERworld Premium Live 2021 at Yokohama Arena	ARENA	\N	
864	2021-06-12	横浜アリーナ		UVERworld Premium Live 2021 at Yokohama Arena	ARENA	\N	
865	2021-05-05	蘇我スポーツ公園		JAPAN JAM 2021	FESTIVAL	\N	
866	2021-05-04	さいたまスーパーアリーナ		VIVA LA ROCK 2021	FESTIVAL	\N	
867	2021-03-08	Toyosu PIT		UVERworld LIVE 0308 - Toyosu PIT -	EVENT	\N	彰 生誕祭
868	2021-03-08	Toyosu PIT		UVERworld LIVE 0308 - Toyosu PIT -	EVENT	\N	彰 生誕祭
869	2020-12-31	マリンメッセ福岡		ARENA LIVE 2020	ONEMAN	\N	
870	2020-12-31	マリンメッセ福岡		ARENA LIVE 2020	ONEMAN	\N	
871	2020-12-30	マリンメッセ福岡		ARENA LIVE 2020	ONEMAN	\N	
872	2020-12-30	マリンメッセ福岡		ARENA LIVE 2020	ONEMAN	\N	
873	2020-12-25	日本武道館		ARENA LIVE 2020	EVENT	\N	Xmas
874	2020-12-25	日本武道館		ARENA LIVE 2020	ONEMAN	\N	
875	2020-12-21	横浜アリーナ		ARENA LIVE 2020	EVENT	\N	TAKUYA∞ 生誕祭
876	2020-12-21	横浜アリーナ		ARENA LIVE 2020	EVENT	\N	TAKUYA∞ 生誕祭
877	2020-12-20	横浜アリーナ		ARENA LIVE 2020	ARENA	\N	
878	2020-12-20	横浜アリーナ		ARENA LIVE 2020	ARENA	\N	
879	2020-11-05	Zepp Tokyo		UVERworld LIVE 1105 -Zepp Tokyo-	EVENT	\N	真太郎 生誕祭
880	2020-11-05	Zepp Tokyo		UVERworld LIVE 1105 -Zepp Tokyo-	EVENT	\N	真太郎 生誕祭
881	2020-09-25	Private Venue		UVERworld LIVE 0925	EVENT	\N	誠果 生誕祭
882	2020-07-06	Private Venue		UVERworld 20&15 ANNIVERSARY LIVE	EVENT	\N	
883	2020-06-06	Private Venue		UVERworld 20&15 ANNIVERSARY LIVE	EVENT	\N	
884	2020-03-06	ミュージックステーション		Music Station Event	EVENT	\N	
885	2020-02-22	Zepp Nagoya		LIVE HOUSE TOUR 2020	EVENT	\N	克哉 生誕祭
886	2020-02-19	Zepp Nagoya		LIVE HOUSE TOUR 2020	LIVEHOUSE	\N	
887	2020-02-18	新木場STUDIO COAST		Monster ROCK Live 2020	LIVEHOUSE	\N	
888	2020-02-17	Zepp Nagoya		LIVE HOUSE TOUR 2020	LIVEHOUSE	\N	
889	2020-02-14	Zepp Osaka Bayside		LIVE HOUSE TOUR 2020	EVENT	\N	信人 生誕祭
814	2022-03-07	Zepp Haneda (TOKYO)	Night Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
812	2022-03-08	Zepp Haneda (TOKYO)		LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	彰 生誕祭
817	2022-03-01	Zepp Fukuoka	Day Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
820	2022-02-21	Zepp Nagoya	Night Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
819	2022-02-21	Zepp Nagoya	Day Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
822	2022-02-13	Zepp Sapporo	Day Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
823	2022-02-13	Zepp Sapporo	Day Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
826	2022-02-08	Zepp Osaka Bayside	Day Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
825	2022-02-08	Zepp Osaka Bayside	Night Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
829	2022-01-31	KT Zepp Yokohama	Night Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
828	2022-01-31	KT Zepp Yokohama	Day Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
890	2020-02-13	Zepp Osaka Bayside		LIVE HOUSE TOUR 2020	LIVEHOUSE	\N	
891	2020-02-06	Zepp Fukuoka		LIVE HOUSE TOUR 2020	LIVEHOUSE	\N	
892	2020-02-05	Zepp Fukuoka		LIVE HOUSE TOUR 2020	LIVEHOUSE	\N	
893	2019-12-31	マリンメッセ福岡		UNSER TOUR	ONEMAN	\N	
894	2019-12-30	マリンメッセ福岡		UNSER TOUR	ONEMAN	\N	
895	2019-12-25	WORLD Kinen Hall		UNSER TOUR	EVENT	\N	Xmas
896	2019-12-24	WORLD Kinen Hall		UNSER TOUR	EVENT	\N	Xmas
897	2019-12-21	横浜アリーナ		UNSER TOUR	EVENT	\N	TAKUYA∞ 生誕祭
900	2019-12-16	duo MUSIC EXCHANGE		UNSER TOUR	ONEMAN	\N	
901	2019-12-13	ミュージックステーション		Music Station Event	EVENT	\N	
902	2019-12-04	大阪城ホール		UNSER TOUR	HALL	\N	
903	2019-12-03	大阪城ホール		UNSER TOUR	HALL	\N	
904	2019-11-24	セキスイハイムスーパーアリーナ		UNSER TOUR	ARENA	\N	
905	2019-11-23	セキスイハイムスーパーアリーナ		UNSER TOUR	ARENA	\N	
906	2019-11-15	Zepp DiverCity (TOKYO)		Supporting for ROTTENGRAFFTY	LIVEHOUSE	\N	
907	2019-11-10	LIQUIDROOM		LIQUIDROOM Event	EVENT	\N	
908	2019-11-05	Zepp Sapporo		Zepp Sapporo Event	EVENT	\N	真太郎 生誕祭
909	2019-10-10	DRUM LOGOS		DRUM LOGOS Event	EVENT	\N	
910	2019-09-29	新木場若洲公園		Shinkiba Wakasu Kouen Event	EVENT	\N	
911	2019-09-25	Toyosu PIT		Toyosu PIT Event	EVENT	\N	誠果 生誕祭
912	2019-09-21	唐船半島芝生広場		Karasuma Hantou Shibafu Hiroba Event	EVENT	\N	
913	2019-09-19	duo MUSIC EXCHANGE		Warm-Up GIG	EVENT	\N	
914	2019-09-18	duo MUSIC EXCHANGE		Warm-Up GIG	EVENT	\N	
915	2019-09-08	Laguna Ten Bosch		Laguna Ten Bosch Event	EVENT	\N	
916	2019-08-25	讃岐まんのう公園		MONSTER baSH 2019	FESTIVAL	\N	
917	2019-08-17	樽川ドック野外特設ステージ		RISING SUN ROCK FESTIVAL 2019 in EZO	FESTIVAL	\N	
918	2019-08-11	国営ひたち海浜公園		Hitachi Kaihin Kouen Event	EVENT	\N	
919	2019-08-03	Maishima		Maishima Event	EVENT	\N	
920	2019-08-01	新木場STUDIO COAST		Warm-Up GIG	LIVEHOUSE	\N	
921	2019-06-06	ミュージックタウン音市場		Music Town Oto Ichiba Event	EVENT	\N	
922	2019-06-05	ミュージックタウン音市場		Music Town Oto Ichiba Event	EVENT	\N	
923	2019-05-30	Toyota Shimin Bunka Kaikan		Toyota Shimin Bunka Kaikan Event	HALL	\N	
924	2019-05-29	Toyota Shimin Bunka Kaikan		Toyota Shimin Bunka Kaikan Event	HALL	\N	
925	2019-05-25	新木場若洲公園		Shinkiba Wakasu Kouen Event	EVENT	\N	
926	2019-05-11	Coastal Resort Hirara		Coastal Resort Hirara Event	LIVEHOUSE	\N	
927	2019-05-06	蘇我スポーツ公園		JAPAN JAM 2019	FESTIVAL	\N	
928	2019-05-05	さいたまスーパーアリーナ		VIVA LA ROCK 2019	FESTIVAL	\N	
929	2019-04-29	大阪城ホール		Osaka-jou Hall Event	HALL	\N	
930	2019-04-26	Bay Hall		Warm-Up GIG	HALL	\N	
931	2019-03-08	Zepp Sapporo		LIVE HOUSE TOUR 2019	EVENT	\N	彰 生誕祭
932	2019-03-05	Zepp Tokyo		LIVE HOUSE TOUR 2019	LIVEHOUSE	\N	
933	2019-03-04	Zepp Tokyo		LIVE HOUSE TOUR 2019	LIVEHOUSE	\N	
934	2019-02-27	Zepp Nagoya		LIVE HOUSE TOUR 2019	LIVEHOUSE	\N	
935	2019-02-22	Hiroshima CLUB QUATTRO		LIVE HOUSE TOUR 2019	EVENT	\N	克哉 生誕祭
936	2019-02-19	Zepp Osaka Bayside		LIVE HOUSE TOUR 2019	LIVEHOUSE	\N	
937	2019-02-14	Zepp Fukuoka		LIVE HOUSE TOUR 2019	EVENT	\N	信人 生誕祭
938	2018-12-31	マリンメッセ福岡		ARENA TOUR 2018	ONEMAN	\N	
939	2018-12-30	マリンメッセ福岡		ARENA TOUR 2018	ONEMAN	\N	
940	2018-12-28	WORLD Kinen Hall		ARENA TOUR 2018	HALL	\N	
941	2018-12-27	WORLD Kinen Hall		ARENA TOUR 2018	HALL	\N	
942	2018-12-25	日本武道館		ARENA TOUR 2018	ONEMAN	\N	
943	2018-12-21	横浜アリーナ		ARENA TOUR 2018	EVENT	\N	TAKUYA∞ 生誕祭
944	2018-12-21	日本武道館		ARENA TOUR 2018	EVENT	\N	TAKUYA∞ 生誕祭
945	2018-12-20	横浜アリーナ		ARENA TOUR 2018	ARENA	\N	
946	2018-12-13	日本ガイシホール		ARENA TOUR 2018	HALL	\N	
947	2018-12-12	日本ガイシホール		ARENA TOUR 2018	HALL	\N	
948	2018-11-25	ビッグハット		ARENA TOUR 2018	ONEMAN	\N	
949	2018-11-24	ビッグハット		ARENA TOUR 2018	ONEMAN	\N	
950	2018-11-21	大阪城ホール		ARENA TOUR 2018	HALL	\N	
951	2018-11-20	大阪城ホール		ARENA TOUR 2018	HALL	\N	
952	2018-11-10	セキスイハイムスーパーアリーナ		ARENA TOUR 2018	ARENA	\N	
953	2018-11-09	セキスイハイムスーパーアリーナ		ARENA TOUR 2018	ARENA	\N	
954	2018-11-05	Toyosu PIT		ARENA TOUR 2018	EVENT	\N	真太郎 生誕祭
955	2018-11-02	PACIFICO Yokohama, Kokuritsu Dai Hall		PACIFICO Yokohama, Kokuritsu Dai Hall Event	HALL	\N	
956	2018-10-26	新木場STUDIO COAST		STUDIO COAST Event	LIVEHOUSE	\N	
957	2018-10-10	Himegin Hall		LIVE TOUR 2018	HALL	\N	
958	2018-10-07	Zepp Tokyo		Shunsuke Kiyokiba × UVERworld	LIVEHOUSE	\N	
959	2018-09-25	Zepp DiverCity (TOKYO)		LIVE TOUR 2018	EVENT	\N	誠果 生誕祭
960	2018-09-23	YAMADA Green Dome Maebashi		YAMADA Green Dome Maebashi Event	ARENA	\N	
961	2018-09-22	唐船半島芝生広場		Karasuma Hantou Shibafu Hiroba Event	EVENT	\N	
962	2018-09-19	Hikone-shi Bunka Plaza		LIVE TOUR 2018	ONEMAN	\N	
963	2018-09-17	Himeji-shi Bunka Center		LIVE TOUR 2018	ONEMAN	\N	
964	2018-09-16	Himeji-shi Bunka Center		LIVE TOUR 2018	ONEMAN	\N	
965	2018-09-13	Bunka Parc Jouyou		LIVE TOUR 2018	ONEMAN	\N	
966	2018-09-12	Bunka Parc Jouyou		LIVE TOUR 2018	ONEMAN	\N	
967	2018-09-09	Miyazaki Shimin Bunka Hall		LIVE TOUR 2018	HALL	\N	
968	2018-09-08	Miyazaki Shimin Bunka Hall		LIVE TOUR 2018	HALL	\N	
969	2018-09-06	Saga-shi Bunka Kaikan		LIVE TOUR 2018	HALL	\N	
970	2018-09-05	長崎ブリックホール		LIVE TOUR 2018	HALL	\N	
971	2018-08-30	Fukuyama Geijutsu Bunka Hall		LIVE TOUR 2018	HALL	\N	
972	2018-08-29	Fukuyama Geijutsu Bunka Hall		LIVE TOUR 2018	HALL	\N	
973	2018-08-27	倉敷市民会館		LIVE TOUR 2018	HALL	\N	
974	2018-08-25	festhalle		LIVE TOUR 2018	HALL	\N	
975	2018-08-22	Himegin Hall		LIVE TOUR 2018	HALL	\N	
976	2018-08-20	CARAVAN SARY		LIVE TOUR 2018	ONEMAN	\N	
977	2018-08-19	讃岐まんのう公園		MONSTER baSH 2018	FESTIVAL	\N	
978	2018-08-16	Tomakomai Shimin Kaikan		LIVE TOUR 2018	HALL	\N	
979	2018-08-14	Kushiro Shimin Bunka Kaikan		LIVE TOUR 2018	HALL	\N	
980	2018-08-11	樽川ドック野外特設ステージ		RISING SUN ROCK FESTIVAL 2018 in EZO	FESTIVAL	\N	
981	2018-08-08	Aiplaza Toyohashi		LIVE TOUR 2018	ONEMAN	\N	
982	2018-08-07	Aiplaza Toyohashi		LIVE TOUR 2018	ONEMAN	\N	
983	2018-08-05	Maishima		Maishima Event	EVENT	\N	
984	2018-08-04	国営ひたち海浜公園		Hitachi Kaihin Kouen Event	EVENT	\N	
985	2018-07-31	Aubade Hall		LIVE TOUR 2018	HALL	\N	
986	2018-07-30	本多の森ホール		LIVE TOUR 2018	HALL	\N	
987	2018-07-28	Hachinohe-shi Koukaidou		LIVE TOUR 2018	ONEMAN	\N	
988	2018-07-27	Iwate Kenmin Kaikan		LIVE TOUR 2018	HALL	\N	
989	2018-07-25	Fukushima-ken Bunka Center		LIVE TOUR 2018	ONEMAN	\N	
990	2018-07-11	Nanba Hatch		Nanba Hatch Event	LIVEHOUSE	\N	
991	2018-07-09	DRUM LOGOS		VS SERIES	ONEMAN	\N	
992	2018-07-05	LIQUIDROOM		VS SERIES	ONEMAN	\N	
993	2018-07-04	LIQUIDROOM		VS SERIES	ONEMAN	\N	
994	2018-07-02	DIAMOND HALL		VS SERIES	HALL	\N	
995	2018-06-09	Toyosu PIT		Toyosu PIT Event	LIVEHOUSE	\N	
996	2018-06-06	B.9 V1		Neo SOUND WAVE CREW LIVE	EVENT	\N	
997	2018-05-26	新木場若洲公園		Shinkiba Wakasu Kouen Event	EVENT	\N	
998	2018-05-04	さいたまスーパーアリーナ		VIVA LA ROCK 2018	FESTIVAL	\N	
999	2018-05-02	Bay Hall		Bay Hall Event	HALL	\N	
1000	2018-03-08	Zepp Osaka Bayside		LIVE TOUR 2018	EVENT	\N	彰 生誕祭
1001	2018-03-07	Zepp Osaka Bayside		LIVE TOUR 2018	LIVEHOUSE	\N	
1002	2018-03-05	music zoo KOBE Taiyou to Tora		VS SERIES	ONEMAN	\N	
1003	2018-02-28	Zepp DiverCity (TOKYO)		LIVE TOUR 2018	LIVEHOUSE	\N	
1004	2018-02-27	Zepp DiverCity (TOKYO)		LIVE TOUR 2018	LIVEHOUSE	\N	
1005	2018-02-22	Zepp Nagoya		LIVE TOUR 2018	EVENT	\N	克哉 生誕祭
1006	2018-02-21	Zepp Nagoya		LIVE TOUR 2018	LIVEHOUSE	\N	
1007	2018-02-14	Zepp Sapporo		LIVE TOUR 2018	EVENT	\N	信人 生誕祭
1008	2018-02-13	Zepp Sapporo		LIVE TOUR 2018	LIVEHOUSE	\N	
1009	2017-12-31	マリンメッセ福岡		TYCOON TOUR	ONEMAN	\N	
1010	2017-12-30	マリンメッセ福岡		TYCOON TOUR	ONEMAN	\N	
1011	2017-12-25	日本武道館		TYCOON TOUR	EVENT	\N	Xmas
1012	2017-12-21	横浜アリーナ		TYCOON TOUR	EVENT	\N	TAKUYA∞ 生誕祭
1013	2017-12-20	横浜アリーナ		TYCOON TOUR	ARENA	\N	
1014	2017-12-17	セキスイハイムスーパーアリーナ		TYCOON TOUR	ARENA	\N	
1015	2017-12-16	セキスイハイムスーパーアリーナ		TYCOON TOUR	ARENA	\N	
1016	2017-12-14	日本ガイシホール		TYCOON TOUR	HALL	\N	
1017	2017-12-13	日本ガイシホール		TYCOON TOUR	HALL	\N	
1018	2017-12-06	朱鷺メッセ		TYCOON TOUR	ONEMAN	\N	
1019	2017-12-05	朱鷺メッセ		TYCOON TOUR	ONEMAN	\N	
1020	2017-11-23	大阪城ホール		TYCOON TOUR	HALL	\N	
1021	2017-11-22	大阪城ホール		TYCOON TOUR	HALL	\N	
1022	2017-11-12	エコパアリーナ		TYCOON TOUR	ARENA	\N	
1023	2017-11-11	エコパアリーナ		TYCOON TOUR	ARENA	\N	
1024	2017-11-05	横浜アリーナ		YOKOHAMA ARENA Event	EVENT	\N	真太郎 生誕祭
1025	2017-11-03	WORLD Kinen Hall		TYCOON TOUR	HALL	\N	
1026	2017-11-02	WORLD Kinen Hall		TYCOON TOUR	HALL	\N	
1027	2017-10-30	TSUTAYA O-EAST		ROCK vs R&B	EVENT	\N	
1028	2017-10-04	日本武道館		IDEAL REALITY TOUR	ONEMAN	\N	
1029	2017-10-03	日本武道館		IDEAL REALITY TOUR	ONEMAN	\N	
1030	2017-09-25	ミュージックタウン音市場		IDEAL REALITY TOUR	EVENT	\N	誠果 生誕祭
1031	2017-09-20	Kagoshima Shimin Bunka Hall		IDEAL REALITY TOUR	HALL	\N	
1032	2017-09-19	Kagoshima Shimin Bunka Hall		IDEAL REALITY TOUR	HALL	\N	
1035	2017-09-13	Wakayama Kenmin Bunka Kaikan		IDEAL REALITY TOUR	HALL	\N	
1036	2017-09-12	Wakayama Kenmin Bunka Kaikan		IDEAL REALITY TOUR	HALL	\N	
1037	2017-09-07	Nara 100-nen Kaikan		IDEAL REALITY TOUR	HALL	\N	
1038	2017-09-06	Nara 100-nen Kaikan		IDEAL REALITY TOUR	HALL	\N	
1039	2017-09-04	周南市文化会館		IDEAL REALITY TOUR	HALL	\N	
1040	2017-09-03	周南市文化会館		IDEAL REALITY TOUR	HALL	\N	
1041	2017-09-01	Shimane Kenmin Kaikan		IDEAL REALITY TOUR	HALL	\N	
1042	2017-08-30	Okayama Shimin Kaikan		IDEAL REALITY TOUR	HALL	\N	
1043	2017-08-29	Okayama Shimin Kaikan		IDEAL REALITY TOUR	HALL	\N	
1044	2017-08-27	Himegin Hall		IDEAL REALITY TOUR	HALL	\N	
1045	2017-08-26	Himegin Hall		IDEAL REALITY TOUR	HALL	\N	
1046	2017-08-24	Naruto-shi  Bunka Kaikan		IDEAL REALITY TOUR	HALL	\N	
1047	2017-08-23	Naruto-shi  Bunka Kaikan		IDEAL REALITY TOUR	HALL	\N	
1048	2017-08-20	Sora no Hiroba		at OCEAN STAGE. 15:20-16:05.	EVENT	\N	
1049	2017-08-19	ZOZO Marine Stadium		at MARINE STAGE. 15:35-16:20.	EVENT	\N	
1050	2017-08-16	Asahikawa Shimin Bunka Kaikan		IDEAL REALITY TOUR	HALL	\N	
1051	2017-08-14	Kitami Shimin Kaikan		IDEAL REALITY TOUR	HALL	\N	
1052	2017-08-11	樽川ドック野外特設ステージ		RISING SUN ROCK FESTIVAL 2017 in EZO	FESTIVAL	\N	
1053	2017-08-09	弘前市民会館		IDEAL REALITY TOUR	HALL	\N	
1054	2017-08-08	弘前市民会館		IDEAL REALITY TOUR	HALL	\N	
1055	2017-08-06	Alios		IDEAL REALITY TOUR	ONEMAN	\N	
1056	2017-08-04	Shelter Nanyou Hall		IDEAL REALITY TOUR	HALL	\N	
1057	2017-07-31	LIQUIDROOM		GROVEST GIG ~ toward IDEAL REALITY ~	ONEMAN	\N	
1058	2017-07-28	ミュージックステーション		Music Station Event	EVENT	\N	
1059	2017-07-26	Rensa		GROVEST GIG ~ toward IDEAL REALITY ~	ONEMAN	\N	
1060	2017-07-19	DRUM Be-1		GROVEST GIG ~ toward IDEAL REALITY ~	ONEMAN	\N	
1061	2017-07-13	Hiroshima CLUB QUATTRO		GROVEST GIG ~ toward IDEAL REALITY ~	ONEMAN	\N	
1062	2017-07-10	CARAVAN SARY		GROVEST GIG ~ toward IDEAL REALITY ~	ONEMAN	\N	
1063	2017-07-06	Electric Lady Land		GROVEST GIG ~ toward IDEAL REALITY ~	ONEMAN	\N	
1064	2017-07-03	梅田CLUB QUATTRO		GROVEST GIG ~ toward IDEAL REALITY ~	ONEMAN	\N	
1065	2017-06-26	PENNY LANE 24		GROVEST GIG ~ toward IDEAL REALITY ~	ONEMAN	\N	
1066	2017-06-09	Akasaka BLITZ		LOCK YOU	EVENT	\N	
1067	2017-05-05	さいたまスーパーアリーナ		VIVA LA ROCK 2017	FESTIVAL	\N	
1068	2017-04-29	大阪城ホール		Osaka-jou Hall Event	HALL	\N	
1069	2017-03-08	Zepp DiverCity (TOKYO)		LIVE HOUSE TOUR 2017	EVENT	\N	彰 生誕祭
1070	2017-03-07	Zepp DiverCity (TOKYO)		LIVE HOUSE TOUR 2017	LIVEHOUSE	\N	
1071	2017-02-28	Zepp Osaka Bayside		LIVE HOUSE TOUR 2017	LIVEHOUSE	\N	
1072	2017-02-27	Zepp Osaka Bayside		LIVE HOUSE TOUR 2017	LIVEHOUSE	\N	
1073	2017-02-22	Zepp Nagoya		LIVE HOUSE TOUR 2017	EVENT	\N	克哉 生誕祭
1074	2017-02-21	Zepp Nagoya		LIVE HOUSE TOUR 2017	LIVEHOUSE	\N	
1075	2017-02-14	Zepp Sapporo		LIVE HOUSE TOUR 2017	EVENT	\N	信人 生誕祭
1076	2017-02-11	さいたまスーパーアリーナ		UVERworld KING’S PARADE 2017	ARENA	\N	
1077	2017-02-10	さいたまスーパーアリーナ		UVERworld ARENA TOUR 2016-2017	ARENA	\N	
1078	2017-01-18	横浜アリーナ		YOKOHAMA ARENA Event	ARENA	\N	
1079	2016-12-31	幕張メッセ国際展示場		COUNTDOWN JAPAN 16/17	FESTIVAL	\N	
1080	2016-12-28	ゼビオアリーナ仙台		ARENA TOUR 2016	ARENA	\N	
1081	2016-12-27	ゼビオアリーナ仙台		ARENA TOUR 2016	ARENA	\N	
1082	2016-12-25	日本武道館		ARENA TOUR 2016	ONEMAN	\N	
1083	2016-12-21	大阪城ホール		ARENA TOUR 2016	EVENT	\N	TAKUYA∞ 生誕祭
1084	2016-12-20	大阪城ホール		ARENA TOUR 2016	HALL	\N	
1085	2016-12-15	Toyosu PIT		Toyosu PIT Event	LIVEHOUSE	\N	
1086	2016-12-14	横浜アリーナ		ARENA TOUR 2016	ARENA	\N	
1087	2016-12-13	横浜アリーナ		ARENA TOUR 2016	ARENA	\N	
1088	2016-12-07	B.9 V1		B.9 V1 Event	EVENT	\N	
1089	2016-12-06	B.9 V1		B.9 V1 Event	EVENT	\N	
1090	2016-12-04	マリンメッセ福岡		ARENA TOUR 2016	ONEMAN	\N	
1091	2016-12-03	マリンメッセ福岡		ARENA TOUR 2016	ONEMAN	\N	
1092	2016-11-30	日本ガイシホール		ARENA TOUR 2016	HALL	\N	
1093	2016-11-29	日本ガイシホール		ARENA TOUR 2016	HALL	\N	
1094	2016-11-20	広島グリーンアリーナ		ARENA TOUR 2016	ARENA	\N	
1095	2016-11-19	広島グリーンアリーナ		ARENA TOUR 2016	ARENA	\N	
1096	2016-11-05	横浜アリーナ		YOKOHAMA ARENA Event	EVENT	\N	真太郎 生誕祭
1097	2016-11-01	Zepp Sapporo		UVERworld vs AK-69 at Zepp Sapporo	LIVEHOUSE	\N	
1098	2016-10-31	Zepp Sapporo		ARENA TOUR 2016	LIVEHOUSE	\N	
1099	2016-09-25	沖縄コンベンションセンター		SUMMER TOUR 2016	EVENT	\N	誠果 生誕祭
1100	2016-09-24	沖縄コンベンションセンター		SUMMER TOUR 2016	ONEMAN	\N	
1101	2016-09-17	Sodegaura Kaihin Kouen		Sodegaura Kaihin Kouen Event	EVENT	\N	
1102	2016-09-12	Fukuoka Sunpalace		THE TAIMAN SHIGA vs CHIBA at Kyushu	EVENT	\N	
1103	2016-09-09	弘前市民会館		SUMMER TOUR 2016	HALL	\N	
1104	2016-09-08	弘前市民会館		SUMMER TOUR 2016	HALL	\N	
1105	2016-09-06	Sendai PIT		SUMMER TOUR 2016	LIVEHOUSE	\N	
1106	2016-09-05	Sendai PIT		SUMMER TOUR 2016	LIVEHOUSE	\N	
1107	2016-09-03	Kooriyama Shimin Bunka Center		SUMMER TOUR 2016	ONEMAN	\N	
1108	2016-09-02	Kooriyama Shimin Bunka Center		SUMMER TOUR 2016	ONEMAN	\N	
1109	2016-08-31	Hokuto Bunka Hall		SUMMER TOUR 2016	HALL	\N	
1110	2016-08-30	Hokuto Bunka Hall		SUMMER TOUR 2016	HALL	\N	
1111	2016-08-28	Aubade Hall		SUMMER TOUR 2016	HALL	\N	
1112	2016-08-27	Aubade Hall		SUMMER TOUR 2016	HALL	\N	
1113	2016-08-23	Nanba Hatch		SUMMER TOUR 2016	LIVEHOUSE	\N	
1114	2016-08-22	Nanba Hatch		SUMMER TOUR 2016	LIVEHOUSE	\N	
1115	2016-08-18	Maizuru-shi Sougou Bunka Kaikan		SUMMER TOUR 2016	HALL	\N	
1116	2016-08-16	倉敷市民会館		SUMMER TOUR 2016	HALL	\N	
1117	2016-08-15	倉敷市民会館		SUMMER TOUR 2016	HALL	\N	
1118	2016-08-13	とりぎん文化会館		SUMMER TOUR 2016	HALL	\N	
1119	2016-08-12	とりぎん文化会館		SUMMER TOUR 2016	HALL	\N	
1120	2016-08-10	レクザムホール		SUMMER TOUR 2016	HALL	\N	
1121	2016-08-09	レクザムホール		SUMMER TOUR 2016	HALL	\N	
1122	2016-08-06	国営ひたち海浜公園		GRASS STAGE	EVENT	\N	
1123	2016-08-03	LIQUIDROOM		SUMMER TOUR 2016	ONEMAN	\N	
1124	2016-08-02	LIQUIDROOM		SUMMER TOUR 2016	ONEMAN	\N	
1125	2016-07-06	LIQUIDROOM		UVERworld PREMIUM LIVE 2016	EVENT	\N	
1126	2016-06-06	BLAZE		UVERworld PREMIUM LIVE 2016	EVENT	\N	
1127	2016-05-29	Laguna Beach		Laguna Beach Event	EVENT	\N	
1128	2016-04-29	大阪城ホール		Osaka-jou Hall Event	HALL	\N	
1129	2016-03-08	梅田CLUB QUATTRO		Umeda CLUB QUATTRO Event	EVENT	\N	彰 生誕祭
1130	2016-03-05	duo MUSIC EXCHANGE		duo MUSIC EXCHANGE Event	EVENT	\N	
1131	2016-02-22	柏PALOOZA		KATSUYA's Birthday Live	EVENT	\N	克哉 生誕祭
1132	2016-02-14	名古屋CLUB QUATTRO		NOBUTO's Birthday Live	EVENT	\N	信人 生誕祭
1133	2015-12-31	マリンメッセ福岡		"15&10" Anniversary Tour	ONEMAN	\N	
1134	2015-12-30	マリンメッセ福岡		"15&10" Anniversary Tour	ONEMAN	\N	
1135	2015-12-25	日本武道館		"15&10" Anniversary Tour	ONEMAN	\N	
1136	2015-12-21	横浜アリーナ		"15&10" Anniversary Tour	EVENT	\N	TAKUYA∞ 生誕祭
1137	2015-12-17	大阪城ホール		"15&10" Anniversary Tour	HALL	\N	
1138	2015-12-16	大阪城ホール		"15&10" Anniversary Tour	HALL	\N	
1139	2015-12-13	セキスイハイムスーパーアリーナ		"15&10" Anniversary Tour	ARENA	\N	
1140	2015-12-12	セキスイハイムスーパーアリーナ		"15&10" Anniversary Tour	ARENA	\N	
1141	2015-12-06	エコパアリーナ		"15&10" Anniversary Tour	ARENA	\N	
1142	2015-12-05	エコパアリーナ		"15&10" Anniversary Tour	ARENA	\N	
1143	2015-11-29	SUNDOME FUKUI		"15&10" Anniversary Tour	ARENA	\N	
1144	2015-11-28	SUNDOME FUKUI		"15&10" Anniversary Tour	ARENA	\N	
1145	2015-11-22	真駒内セキスイハイムアイスアリーナ		"15&10" Anniversary Tour	ARENA	\N	
1146	2015-11-21	真駒内セキスイハイムアイスアリーナ		"15&10" Anniversary Tour	ARENA	\N	
1147	2015-11-05	ミュージックタウン音市場		"15&10" Anniversary Tour	EVENT	\N	真太郎 生誕祭
1148	2015-11-01	広島グリーンアリーナ		"15&10" Anniversary Tour	ARENA	\N	
1149	2015-10-31	広島グリーンアリーナ		"15&10" Anniversary Tour	ARENA	\N	
1150	2015-10-20	Akasaka BLITZ		Akasaka BLITZ Event	EVENT	\N	
1151	2015-10-16	Zepp Sapporo		"15&10" Anniversary Tour	LIVEHOUSE	\N	
1152	2015-10-15	Zepp Sapporo		"15&10" Anniversary Tour	LIVEHOUSE	\N	
1153	2015-10-12	Nanba Hatch		"15&10" Anniversary Tour	LIVEHOUSE	\N	
1154	2015-10-07	Zepp DiverCity (TOKYO)		"15&10" Anniversary Tour	LIVEHOUSE	\N	
1155	2015-10-06	Zepp DiverCity (TOKYO)		"15&10" Anniversary Tour	LIVEHOUSE	\N	
1156	2015-10-04	高松オリーブホール		"15&10" Anniversary Tour	HALL	\N	
1157	2015-10-03	高松オリーブホール		"15&10" Anniversary Tour	HALL	\N	
1158	2015-10-01	Zepp Nagoya		"15&10" Anniversary Tour	LIVEHOUSE	\N	
1159	2015-09-30	Zepp Nagoya		"15&10" Anniversary Tour	LIVEHOUSE	\N	
1160	2015-09-28	Rensa		"15&10" Anniversary Tour	ONEMAN	\N	
1161	2015-09-25	Zepp Fukuoka		"15&10" Anniversary Tour	EVENT	\N	誠果 生誕祭
1162	2015-09-24	Zepp Fukuoka		"15&10" Anniversary Tour	LIVEHOUSE	\N	
1165	2015-09-13	WORLD Kinen Hall		LIVE TOUR 2015	HALL	\N	
1166	2015-09-12	WORLD Kinen Hall		LIVE TOUR 2015	HALL	\N	
1167	2015-09-09	Saga-shi Bunka Kaikan		LIVE TOUR 2015	HALL	\N	
1168	2015-09-06	国立代々木競技場 第一体育館		LIVE TOUR 2015	ONEMAN	\N	
1169	2015-09-05	国立代々木競技場 第一体育館		LIVE TOUR 2015	ONEMAN	\N	
1170	2015-09-03	国立代々木競技場 第一体育館		LIVE TOUR 2015	ONEMAN	\N	
1171	2015-09-02	国立代々木競技場 第一体育館		LIVE TOUR 2015	ONEMAN	\N	
1172	2015-08-30	Miyazaki Shimin Bunka Hall		LIVE TOUR 2015	HALL	\N	
1173	2015-08-20	アクトシティ浜松		LIVE TOUR 2015	ONEMAN	\N	
1174	2015-08-17	Wakayama Kenmin Bunka Kaikan		LIVE TOUR 2015	HALL	\N	
1175	2015-08-15	Himeji-shi Bunka Center		LIVE TOUR 2015	ONEMAN	\N	
1176	2015-08-13	Colany Bunka Hall		LIVE TOUR 2015	HALL	\N	
1177	2015-08-12	Colany Bunka Hall		LIVE TOUR 2015	HALL	\N	
1178	2015-08-07	Niigata Kenmin Kaikan		LIVE TOUR 2015	HALL	\N	
1179	2015-08-05	本多の森ホール		LIVE TOUR 2015	HALL	\N	
1180	2015-08-04	本多の森ホール		LIVE TOUR 2015	HALL	\N	
1181	2015-08-02	国営ひたち海浜公園		Hitachi Kaihin Kouen Event	EVENT	\N	
1182	2015-07-30	duo MUSIC EXCHANGE		LIVE TOUR 2015	ONEMAN	\N	
1183	2015-07-23	DIAMOND HALL		LIVE TOUR 2015	HALL	\N	
1184	2015-07-21	TSUTAYA O-EAST		LIVE TOUR 2015	ONEMAN	\N	
1185	2015-07-14	新木場STUDIO COAST		STUDIO COAST Event	LIVEHOUSE	\N	
1186	2015-04-16	Toyosu PIT		Toyosu PIT Event	LIVEHOUSE	\N	
1187	2015-03-08	Bay Hall		AKIRA's Birthday Live	EVENT	\N	彰 生誕祭
1188	2015-02-22	HIPSHOT JAPAN		KATSUYA's Birthday Live	EVENT	\N	克哉 生誕祭
1189	2015-02-14	Zepp Sapporo		NOBUTO's Birthday Live	EVENT	\N	信人 生誕祭
1190	2015-01-17	Zepp Nagoya		Zepp Nagoya Event	LIVEHOUSE	\N	
1191	2015-01-10	横浜アリーナ		Ø CHOIR TOUR 2014-2015	ARENA	\N	
1192	2015-01-07	日本ガイシホール		Ø CHOIR TOUR 2014-2015	HALL	\N	
1193	2015-01-06	日本ガイシホール		Ø CHOIR TOUR 2014-2015	HALL	\N	
1163	2015-09-20	唐船半島芝生広場		イナズマロック フェス 2015	FESTIVAL	\N	
1164	2015-09-19	唐船半島芝生広場		イナズマロック フェス 2015	FESTIVAL	\N	
898	2019-12-20	東京ドーム		KING’S PARADE 男祭り FINAL	EVENT	\N	男祭り
899	2019-12-19	東京ドーム		UNSER TOUR	ARENA	\N	
1194	2026-01-26	Zepp Haneda	Zepp Haneda Day1	UVERworld LIVE TOUR 2026	ONEMAN	\N	\N
1195	2026-02-25	Zepp Haneda	Zepp Haneda Day2	UVERworld LIVE TOUR 2026	ONEMAN	\N	\N
695	2024-07-27	KOREA UNIVERSITY TIGER DOME		Korea University Hwajeong Gymnasium Event	EVENT	\N	KOREA公演
1196	2027-01-25	東京ドーム	男祭り at TOKYO DOME	UVERworld KING'S PARADE 2026	ONEMAN	\N	男祭り
1197	2026-03-25	Venue 1	Future Live Test 1	UVERworld FUTURE TOUR 2026	tour	\N	
813	2022-03-07	Zepp Haneda (TOKYO)	Day Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
816	2022-03-01	Zepp Fukuoka	Night Live	LIVE HOUSE TOUR 2022 ~ NEVER ENDING WORLD ~	LIVEHOUSE	\N	
1033	2017-09-16	唐船半島芝生広場		イナズマロック フェス 2017	FESTIVAL	\N	
1034	2017-09-15	唐船半島芝生広場		イナズマロック フェス 2016 リターンズ	FESTIVAL	\N	
\.


--
-- Data for Name: security_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.security_logs (id, "timestamp", event_type, message, user_email, ip_address, details, created_at) FROM stdin;
1	2026-01-24 01:07:38.862335	login_failed	パスワード不一致	test@example.com	::1	\N	2026-01-24 01:07:38.862335
2	2026-01-24 01:08:07.88981	login_failed	ユーザーが存在しません	hacker@evil.com	::1	\N	2026-01-24 01:08:07.88981
3	2026-01-24 02:34:02.264629	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 02:34:02.264629
4	2026-01-24 02:34:07.17085	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 02:34:07.17085
5	2026-01-24 02:34:15.414683	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 02:34:15.414683
6	2026-01-24 02:35:19.778843	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 02:35:19.778843
7	2026-01-24 02:36:58.612509	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 02:36:58.612509
8	2026-01-24 03:05:19.081937	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 03:05:19.081937
9	2026-01-24 06:50:05.693365	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 06:50:05.693365
10	2026-01-24 06:52:55.608328	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 06:52:55.608328
11	2026-01-24 06:52:57.573488	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 06:52:57.573488
12	2026-01-24 07:06:30.157141	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 07:06:30.157141
13	2026-01-24 07:09:46.651285	login_failed	パスワード不一致	a@a	::1	\N	2026-01-24 07:09:46.651285
14	2026-01-25 05:19:53.764212	login_failed	パスワード不一致	a@a	::1	\N	2026-01-25 05:19:53.764212
15	2026-01-25 05:20:00.383431	login_failed	パスワード不一致	a@a	::1	\N	2026-01-25 05:20:00.383431
16	2026-01-25 05:20:07.476791	login_failed	パスワード不一致	a@a	::1	\N	2026-01-25 05:20:07.476791
\.


--
-- Data for Name: setlists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.setlists (id, live_id, song_id, "position", note) FROM stdin;
11870	661	242	1	\N
11871	661	109	2	\N
11872	661	244	3	\N
11873	661	212	4	\N
11874	661	142	5	\N
11875	661	102	6	\N
11876	661	285	7	\N
16062	1181	241	4	\N
11893	662	252	1	\N
11894	662	46	2	\N
11895	662	100	3	\N
11896	662	104	4	\N
11897	662	248	5	\N
11898	662	169	6	\N
11899	662	125	7	\N
11901	662	173	9	\N
11902	662	228	10	\N
11903	662	176	11	\N
11904	662	320	12	\N
11905	662	240	13	\N
11906	662	154	14	\N
11907	662	279	15	\N
11908	662	132	16	\N
11909	662	133	17	\N
11910	662	95	18	\N
11911	662	260	19	\N
11912	662	272	20	\N
11913	662	155	21	\N
11914	663	1	1	\N
11915	663	7	2	\N
11916	663	333	3	\N
11917	663	45	4	\N
11918	663	270	5	\N
11919	663	113	6	\N
11920	663	124	7	\N
11921	663	2	8	\N
16063	1181	227	5	\N
11923	663	170	10	\N
11924	663	153	11	\N
11925	663	269	12	\N
11926	663	251	13	\N
11927	663	171	14	\N
11928	663	265	15	\N
11930	663	279	17	\N
11931	663	132	18	\N
11932	663	133	19	\N
11933	663	126	20	\N
11934	663	174	21	\N
11935	663	130	22	\N
11936	663	131	23	\N
11937	664	304	1	\N
11938	664	13	2	\N
11939	664	132	3	\N
11940	664	133	4	\N
11942	664	38	6	\N
11943	664	130	7	\N
11944	664	14	8	\N
11945	664	155	9	\N
11946	665	304	1	\N
11947	665	13	2	\N
11949	665	38	4	\N
11950	665	12	5	\N
11951	665	3	6	\N
11952	665	132	7	\N
11953	665	133	8	\N
11954	665	130	9	\N
11955	665	14	10	\N
11956	665	271	11	\N
11957	665	265	12	\N
11958	665	231	13	\N
11959	666	391	1	\N
11960	666	242	2	\N
11961	666	2	3	\N
11962	666	118	4	\N
11963	666	248	5	\N
11964	666	122	6	\N
11965	666	120	7	\N
11966	666	7	8	\N
11967	666	124	9	\N
11968	666	270	10	\N
11969	666	114	11	\N
11971	666	6	13	\N
11972	666	269	14	\N
11973	666	169	15	\N
11974	666	106	16	\N
11975	666	376	17	\N
11976	666	279	18	\N
11977	666	121	19	\N
11978	666	132	20	\N
11979	666	133	21	\N
11980	666	130	22	\N
11981	666	14	23	\N
11982	666	131	24	\N
11983	666	159	25	\N
11984	667	318	1	\N
11985	667	242	2	\N
11987	667	244	4	\N
11988	667	126	5	\N
11989	667	142	6	\N
11990	667	235	7	\N
11991	667	219	8	\N
11992	667	98	9	\N
11993	667	125	10	\N
11995	667	115	12	\N
11996	667	174	13	\N
11997	667	176	14	\N
11998	667	112	15	\N
11999	667	251	16	\N
12000	667	279	17	\N
12001	667	159	18	\N
12002	667	132	19	\N
12003	667	133	20	\N
12004	667	130	21	\N
12005	667	190	22	\N
12006	667	18	23	\N
12007	668	304	1	\N
12008	668	17	2	\N
12009	668	3	3	\N
12010	668	4	4	\N
12011	668	260	5	\N
12012	668	235	6	\N
12013	668	231	7	\N
12014	668	268	8	\N
12015	668	342	9	\N
12017	668	12	11	\N
12018	668	271	12	\N
12019	668	119	13	\N
12020	668	285	14	\N
12021	668	210	15	\N
12022	668	13	16	\N
12023	668	132	17	\N
12024	668	133	18	\N
12025	668	130	19	\N
12026	668	14	20	\N
12027	668	272	21	\N
12028	668	131	22	\N
12030	668	38	24	\N
12031	669	242	1	\N
12032	669	212	2	\N
12033	669	244	3	\N
12034	669	270	4	\N
12035	669	111	5	\N
12036	669	38	6	\N
12037	669	2	7	\N
12038	669	45	8	\N
12039	669	148	9	\N
12040	669	115	10	\N
12041	669	9	11	\N
12042	669	120	12	\N
12044	669	251	14	\N
12045	669	186	15	\N
12046	669	279	16	\N
12047	669	13	17	\N
12048	669	132	18	\N
12049	669	133	19	\N
12050	669	130	20	\N
12051	669	14	21	\N
12052	669	131	22	\N
12053	669	155	23	\N
12054	670	242	1	\N
11994	667	103	11	\N
11970	666	195	12	\N
11900	662	359	8	\N
12043	669	359	13	\N
11986	667	5	3	\N
11878	661	97	9	\N
11879	661	270	10	\N
11881	661	6	12	\N
11882	661	251	13	\N
12055	670	155	2	\N
12056	670	333	3	\N
12057	670	138	4	\N
12058	670	270	5	\N
12059	670	2	6	\N
12060	670	7	7	\N
12061	670	99	8	\N
12062	670	113	9	\N
16064	1181	213	6	\N
12064	670	306	11	\N
12065	670	269	12	\N
12066	670	251	13	\N
12067	670	279	14	\N
12068	670	132	15	\N
12069	670	133	16	\N
12070	670	38	17	\N
12071	670	130	18	\N
12072	670	272	19	\N
12073	670	260	20	\N
12074	671	252	1	\N
12075	671	17	2	\N
12076	671	115	3	\N
12077	671	244	4	\N
12078	671	270	5	\N
12079	671	142	6	\N
12080	671	2	7	\N
12081	671	107	8	\N
12082	671	233	9	\N
12084	671	285	11	\N
12085	671	208	12	\N
12086	671	127	13	\N
12087	671	251	14	\N
12088	671	279	15	\N
12089	671	132	16	\N
12090	671	133	17	\N
12091	671	130	18	\N
12092	671	231	19	\N
12093	671	272	20	\N
12094	671	131	21	\N
12095	671	132	22	\N
12096	672	242	1	\N
12098	672	212	3	\N
12099	672	4	4	\N
12100	672	227	5	\N
12101	672	197	6	\N
12102	672	124	7	\N
12103	672	100	8	\N
12104	672	98	9	\N
12105	672	251	10	\N
12106	672	12	11	\N
12107	672	119	12	\N
12108	672	269	13	\N
12110	672	210	15	\N
12111	672	132	16	\N
12112	672	133	17	\N
12113	672	14	18	\N
12114	672	272	19	\N
12115	672	155	20	\N
12116	673	329	1	\N
12117	673	138	2	\N
12118	673	248	3	\N
12119	673	174	4	\N
12120	673	135	5	\N
12121	673	99	6	\N
12122	673	233	7	\N
12123	673	2	8	\N
12124	673	7	9	\N
12126	673	113	11	\N
12128	673	137	13	\N
12129	673	6	14	\N
12130	673	306	15	\N
12131	673	279	16	\N
12132	673	155	17	\N
12133	673	132	18	\N
12134	673	133	19	\N
12135	673	38	20	\N
12136	673	260	21	\N
12137	673	285	22	\N
12138	674	318	1	\N
12139	674	155	2	\N
12140	674	138	3	\N
12142	674	135	5	\N
12143	674	4	6	\N
12144	674	2	7	\N
12145	674	6	8	\N
12146	674	7	9	\N
12147	674	173	10	\N
12148	674	137	11	\N
12149	674	279	12	\N
12150	674	132	13	\N
12151	674	133	14	\N
12152	674	38	15	\N
12153	674	285	16	\N
12154	674	18	17	\N
12155	675	252	1	\N
12156	675	7	2	\N
12157	675	233	3	\N
12158	675	100	4	\N
12159	675	99	5	\N
12160	675	138	6	\N
12161	675	268	7	\N
12162	675	306	8	\N
12163	675	113	9	\N
16066	1181	38	8	\N
12165	675	98	11	\N
12166	675	173	12	\N
12167	675	124	13	\N
12168	675	246	14	\N
12169	675	279	15	\N
12170	675	155	16	\N
12172	675	132	18	\N
12173	675	38	19	\N
12174	675	260	20	\N
12175	675	285	21	\N
12176	675	133	22	\N
12177	676	304	1	\N
12178	676	12	2	\N
12179	676	233	3	\N
12180	676	244	4	\N
12182	676	148	6	\N
12183	676	2	7	\N
12184	676	113	8	\N
12185	676	176	9	\N
12186	676	208	10	\N
12187	676	6	11	\N
12188	676	269	12	\N
12189	676	251	13	\N
12190	676	112	14	\N
12191	676	261	15	\N
12192	676	279	16	\N
12193	676	114	17	\N
12194	676	132	18	\N
12195	676	133	19	\N
12196	676	130	20	\N
12197	676	271	21	\N
12198	676	272	22	\N
12199	676	131	23	\N
12200	676	155	24	\N
12201	677	242	1	\N
12202	677	212	2	\N
12204	677	241	4	\N
12205	677	24	5	\N
12206	677	111	6	\N
12207	677	235	7	\N
12208	677	120	8	\N
12209	677	202	9	\N
12210	677	9	10	\N
12212	677	153	12	\N
12213	677	203	13	\N
12214	677	249	14	\N
12215	677	279	15	\N
12216	677	8	16	\N
12217	677	132	17	\N
12218	677	133	18	\N
12219	677	130	19	\N
12220	677	272	20	\N
12221	677	131	21	\N
12222	677	107	22	\N
12223	678	121	1	\N
12224	678	233	2	\N
12225	678	244	3	\N
12226	678	219	4	\N
12227	678	205	5	\N
12228	678	169	6	\N
12229	678	2	7	\N
12230	678	197	8	\N
12231	678	208	9	\N
12232	678	176	10	\N
12233	678	269	11	\N
12234	678	238	12	\N
12235	678	376	13	\N
12236	678	279	14	\N
12237	678	114	15	\N
12238	678	132	16	\N
12239	678	133	17	\N
12141	674	195	4	\N
12171	675	195	17	\N
12109	672	207	14	\N
12127	673	359	12	\N
16065	1181	277	7	\N
12097	672	5	2	\N
12240	678	154	18	\N
12241	678	130	19	\N
12242	678	260	20	\N
12243	678	131	21	\N
12244	678	132	22	\N
12245	679	318	1	\N
12246	679	333	2	\N
12247	679	17	3	\N
12248	679	212	4	\N
12249	679	270	5	\N
12250	679	205	6	\N
12251	679	235	7	\N
12252	679	45	8	\N
12253	679	133	9	\N
16067	1181	220	9	\N
12256	679	126	12	\N
12257	679	118	13	\N
12258	679	176	14	\N
12259	679	269	15	\N
12260	679	110	16	\N
12261	679	131	17	\N
12262	679	279	18	\N
12263	679	213	19	\N
12264	679	113	20	\N
12265	679	271	21	\N
12267	679	38	23	\N
12268	679	14	24	\N
12269	679	285	25	\N
12270	679	18	26	\N
12271	680	121	1	\N
12272	680	126	2	\N
12273	680	135	3	\N
12274	680	117	4	\N
12275	680	154	5	\N
12276	680	151	6	\N
12277	680	205	7	\N
12278	680	6	8	\N
12279	680	9	9	\N
12280	680	176	10	\N
12281	680	169	11	\N
12282	680	119	12	\N
12283	680	168	13	\N
12284	680	112	14	\N
12285	680	94	15	\N
12286	680	279	16	\N
12287	680	13	17	\N
12288	680	132	18	\N
12289	680	133	19	\N
12290	680	130	20	\N
12291	680	272	21	\N
12292	680	131	22	\N
12293	681	304	1	\N
12294	681	2	2	\N
12295	681	244	3	\N
12296	681	160	4	\N
12297	681	197	5	\N
12298	681	270	6	\N
12299	681	148	7	\N
12300	681	235	8	\N
12301	681	219	9	\N
12302	681	202	10	\N
12305	681	269	13	\N
12306	681	209	14	\N
12307	681	261	15	\N
12309	681	279	17	\N
12311	681	132	19	\N
12312	681	133	20	\N
12313	681	130	21	\N
12314	681	14	22	\N
12315	681	131	23	\N
12316	682	1	1	\N
12317	682	306	2	\N
12318	682	160	3	\N
12319	682	270	4	\N
12320	682	99	5	\N
12321	682	269	6	\N
12322	682	148	7	\N
12323	682	235	8	\N
12324	682	120	9	\N
12325	682	132	10	\N
12326	682	333	11	\N
12327	682	176	12	\N
12328	682	137	13	\N
12329	682	171	14	\N
12331	682	279	16	\N
12332	682	24	17	\N
12334	682	133	19	\N
12335	682	130	20	\N
12336	682	14	21	\N
12337	682	131	22	\N
12338	682	155	23	\N
12339	683	304	1	\N
12340	683	130	2	\N
12341	683	133	3	\N
12342	683	244	4	\N
12343	683	219	5	\N
12344	683	205	6	\N
12345	683	148	7	\N
12346	683	2	8	\N
12347	683	17	9	\N
12348	683	132	10	\N
12350	683	179	12	\N
12351	683	9	13	\N
12352	683	108	14	\N
12353	683	6	15	\N
12354	683	279	16	\N
12355	683	115	17	\N
12356	683	126	18	\N
12357	683	4	19	\N
12358	683	260	20	\N
12359	683	271	21	\N
12360	683	131	22	\N
12361	684	252	1	\N
12362	684	121	2	\N
12363	684	244	3	\N
12364	684	126	4	\N
12365	684	270	5	\N
12366	684	205	6	\N
12367	684	120	7	\N
12368	684	2	8	\N
12369	684	219	9	\N
16068	1181	285	10	\N
12371	684	173	11	\N
12372	684	176	12	\N
12373	684	127	13	\N
12374	684	171	14	\N
12375	684	131	15	\N
12376	684	279	16	\N
12377	684	170	17	\N
12378	684	118	18	\N
12379	684	4	19	\N
12380	684	130	20	\N
12381	684	271	21	\N
12382	684	238	22	\N
12383	684	231	23	\N
12384	684	14	24	\N
12385	685	304	1	\N
12386	685	17	2	\N
12387	685	244	3	\N
12388	685	111	4	\N
12390	685	179	6	\N
12391	685	235	7	\N
12392	685	46	8	\N
12393	685	122	9	\N
12394	685	24	10	\N
12395	685	226	11	\N
12396	685	110	12	\N
12397	685	131	13	\N
12398	685	279	14	\N
12399	685	117	15	\N
12400	685	130	16	\N
12401	685	8	17	\N
12402	685	271	18	\N
12403	685	14	19	\N
12404	685	238	20	\N
12405	685	285	21	\N
12406	686	242	1	\N
12407	686	115	2	\N
12408	686	184	3	\N
12409	686	244	4	\N
16128	1187	107	8	\N
12411	686	114	6	\N
12412	686	124	7	\N
12413	686	160	8	\N
12414	686	6	9	\N
12415	686	9	10	\N
12416	686	260	11	\N
12417	686	269	12	\N
12418	686	186	13	\N
12419	686	265	14	\N
12420	686	279	15	\N
12421	686	130	16	\N
12422	686	126	17	\N
12424	686	271	19	\N
12389	685	201	5	\N
12255	679	195	11	\N
12304	681	359	12	\N
12349	683	359	11	\N
12266	679	277	22	\N
12310	681	5	18	\N
12333	682	5	18	\N
12425	686	14	20	\N
12426	686	131	21	\N
12427	687	329	1	\N
12428	687	2	2	\N
12429	687	118	3	\N
12430	687	202	4	\N
12431	687	270	5	\N
12432	687	148	6	\N
12433	687	231	7	\N
12434	687	235	8	\N
12435	687	109	9	\N
12436	687	205	10	\N
12437	687	260	11	\N
12438	687	119	12	\N
12439	687	269	13	\N
12440	687	131	14	\N
12441	687	279	15	\N
12442	687	155	16	\N
12443	687	4	17	\N
12444	687	113	18	\N
12445	687	126	19	\N
12446	687	271	20	\N
12447	687	14	21	\N
12448	687	130	22	\N
12450	688	248	2	\N
12451	688	270	3	\N
12452	688	17	4	\N
12453	688	126	5	\N
12454	688	109	6	\N
12455	688	132	7	\N
12456	688	115	8	\N
12457	688	202	9	\N
12458	688	130	10	\N
12459	688	261	11	\N
12460	688	273	12	\N
12461	688	279	13	\N
12462	688	213	14	\N
12463	688	4	15	\N
12464	688	271	16	\N
12465	688	260	17	\N
12466	688	285	18	\N
12467	688	231	19	\N
12469	689	38	2	\N
12470	689	45	3	\N
12471	689	12	4	\N
12472	689	14	5	\N
12473	689	271	6	\N
12474	689	130	7	\N
12475	689	112	8	\N
12476	689	16	9	\N
12477	689	132	10	\N
12478	689	13	11	\N
12479	690	13	1	\N
12480	690	45	2	\N
12481	690	12	3	\N
12482	690	14	4	\N
12483	690	271	5	\N
12484	690	130	6	\N
12485	690	231	7	\N
12487	691	38	2	\N
12488	691	12	3	\N
12489	691	14	4	\N
12490	691	271	5	\N
12491	691	130	6	\N
12492	691	285	7	\N
12493	692	13	1	\N
12494	692	38	2	\N
12496	692	12	4	\N
12497	692	14	5	\N
12498	692	271	6	\N
12499	692	130	7	\N
12500	693	13	1	\N
12501	693	45	2	\N
12502	693	38	3	\N
12503	693	12	4	\N
12504	693	14	5	\N
12505	693	271	6	\N
12506	693	130	7	\N
12507	693	17	8	\N
12508	693	285	9	\N
12509	694	13	1	\N
12510	694	248	2	\N
12511	694	45	3	\N
12512	694	212	4	\N
12513	694	38	5	\N
12514	694	12	6	\N
12515	694	14	7	\N
12516	694	271	8	\N
12517	694	130	9	\N
12518	694	6	10	\N
12519	694	17	11	\N
12520	695	13	1	\N
12521	695	45	2	\N
12522	695	38	3	\N
12523	695	393	4	\N
12524	695	12	5	\N
12525	695	394	6	\N
12526	695	395	7	\N
12527	695	265	8	\N
12528	695	130	9	\N
12529	695	14	10	\N
12530	695	271	11	\N
12531	696	13	1	\N
12532	696	45	2	\N
12533	696	38	3	\N
12534	696	12	4	\N
12535	696	14	5	\N
12536	696	271	6	\N
12537	696	130	7	\N
12538	696	285	8	\N
12539	697	3	1	\N
12540	697	115	2	\N
12541	697	38	3	\N
12542	697	12	4	\N
12544	697	396	6	\N
12545	697	267	7	\N
12546	697	231	8	\N
12547	697	14	9	\N
12548	697	130	10	\N
12549	697	271	11	\N
12550	697	13	12	\N
12551	698	13	1	\N
12552	698	45	2	\N
12553	698	38	3	\N
12554	698	12	4	\N
12555	698	14	5	\N
12556	698	271	6	\N
12557	698	130	7	\N
12558	698	285	8	\N
12559	698	17	9	\N
12560	699	304	1	\N
12561	699	3	2	\N
12562	699	118	3	\N
12563	699	125	4	\N
12564	699	270	5	\N
12565	699	263	6	\N
12566	699	153	7	\N
12567	699	109	8	\N
12568	699	115	9	\N
12569	699	113	10	\N
12570	699	97	11	\N
12571	699	6	12	\N
12573	699	236	14	\N
12574	699	279	15	\N
12575	699	260	16	\N
12576	699	120	17	\N
12577	699	117	18	\N
12578	699	271	19	\N
12579	699	130	20	\N
12580	699	131	21	\N
12581	700	242	1	\N
12582	700	45	2	\N
12583	700	38	3	\N
12584	700	13	4	\N
12585	700	12	5	\N
12586	700	394	6	\N
12587	700	231	7	\N
12588	700	14	8	\N
12589	700	271	9	\N
12590	700	130	10	\N
12591	700	16	11	\N
12592	700	220	12	\N
12593	700	285	13	\N
12594	701	329	1	\N
12595	701	121	2	\N
12596	701	115	3	\N
12597	701	270	4	\N
12598	701	237	5	\N
12599	701	151	6	\N
12600	701	2	7	\N
12601	701	6	8	\N
12602	701	9	9	\N
12603	701	269	10	\N
12604	701	8	11	\N
12605	701	119	12	\N
12606	701	137	13	\N
12607	701	193	14	\N
12608	701	236	15	\N
12609	701	279	16	\N
12449	688	359	1	\N
12468	689	277	1	\N
12486	691	277	1	\N
12610	701	24	17	\N
12611	701	208	18	\N
12612	701	130	19	\N
12613	701	131	20	\N
12614	701	13	21	\N
12615	702	212	1	\N
12616	702	13	2	\N
12617	702	12	3	\N
12618	702	38	4	\N
12619	702	271	5	\N
12620	702	14	6	\N
12621	702	130	7	\N
12622	702	265	8	\N
12623	703	13	1	\N
12624	703	12	2	\N
12625	703	38	3	\N
12626	703	267	4	\N
12627	703	271	5	\N
12628	703	14	6	\N
12629	703	130	7	\N
12630	703	16	8	\N
12631	703	285	9	\N
12632	704	212	1	\N
12633	704	13	2	\N
12634	704	38	3	\N
12635	704	12	4	\N
12636	704	267	5	\N
12637	704	231	6	\N
12638	704	14	7	\N
12639	704	271	8	\N
12640	704	130	9	\N
12641	705	212	1	\N
12642	705	13	2	\N
12643	705	38	3	\N
12644	705	12	4	\N
12645	705	14	5	\N
12646	705	271	6	\N
12647	705	130	7	\N
12648	705	231	8	\N
12649	706	329	1	\N
12650	706	2	2	\N
12651	706	6	3	\N
12652	706	269	4	\N
12653	706	7	5	\N
12654	706	190	6	\N
12655	706	212	7	\N
12657	706	98	9	\N
12658	706	130	10	\N
12659	706	231	11	\N
12660	706	134	12	\N
12661	706	279	13	\N
12662	706	109	14	\N
12663	706	285	15	\N
12665	706	38	17	\N
12666	706	271	18	\N
12667	706	14	19	\N
12668	706	137	20	\N
12669	706	193	21	\N
12670	706	18	22	\N
12671	707	329	1	\N
12672	707	13	2	\N
12673	707	155	3	\N
12674	707	4	4	\N
12675	707	202	5	\N
12676	707	2	6	\N
12677	707	153	7	\N
12678	707	142	8	\N
12679	707	187	9	\N
12680	707	219	10	\N
12681	707	228	11	\N
12682	707	285	12	\N
12683	707	190	13	\N
12684	707	279	14	\N
12685	707	205	15	\N
12686	707	6	16	\N
12688	707	130	18	\N
12689	707	271	19	\N
12690	707	14	20	\N
12691	708	242	1	\N
12692	708	181	2	\N
12693	708	135	3	\N
12695	708	2	5	\N
12696	708	153	6	\N
12697	708	97	7	\N
12698	708	9	8	\N
12699	708	47	9	\N
12700	708	219	10	\N
12701	708	205	11	\N
12703	708	172	13	\N
12704	708	110	14	\N
12705	708	279	15	\N
12706	708	185	16	\N
12707	708	6	17	\N
12708	708	271	18	\N
12709	708	130	19	\N
12710	708	190	20	\N
12711	708	151	21	\N
12712	708	173	22	\N
12713	709	329	1	\N
12714	709	38	2	\N
12715	709	212	3	\N
12716	709	185	4	\N
12717	709	2	5	\N
12718	709	122	6	\N
12719	709	120	7	\N
12720	709	181	8	\N
12721	709	222	9	\N
12722	709	139	10	\N
12723	709	213	11	\N
12724	709	258	12	\N
12725	709	98	13	\N
12726	709	148	14	\N
12727	709	279	15	\N
12728	709	241	16	\N
12729	709	109	17	\N
12730	709	154	18	\N
12731	709	271	19	\N
12732	709	285	20	\N
12733	709	102	21	\N
12734	710	304	1	\N
12735	710	46	2	\N
12736	710	123	3	\N
16069	1182	3	1	\N
12738	710	135	5	\N
16070	1182	212	2	\N
12740	710	153	7	\N
12741	710	124	8	\N
12742	710	113	9	\N
12743	710	184	10	\N
12744	710	172	11	\N
16071	1182	241	3	\N
12746	710	340	13	\N
12747	710	228	14	\N
12748	710	271	15	\N
12749	710	168	16	\N
12750	710	279	17	\N
12751	710	6	18	\N
12752	710	269	19	\N
12753	710	130	20	\N
12754	710	260	21	\N
12755	710	190	22	\N
12756	710	18	23	\N
12757	711	242	1	\N
12758	711	17	2	\N
12759	711	213	3	\N
12760	711	222	4	\N
12761	711	97	5	\N
12762	711	153	6	\N
12763	711	271	7	\N
12764	711	113	8	\N
12765	711	219	9	\N
12766	711	184	10	\N
12767	711	228	11	\N
12768	711	6	12	\N
12769	711	340	13	\N
12770	711	130	14	\N
12771	711	112	15	\N
12772	711	279	16	\N
12773	711	2	17	\N
12774	711	120	18	\N
12775	711	12	19	\N
12776	711	3	20	\N
12777	711	285	21	\N
12778	711	14	22	\N
12779	712	242	1	\N
12780	712	46	2	\N
16072	1182	227	4	\N
12782	712	197	4	\N
12783	712	47	5	\N
12784	712	160	6	\N
12785	712	124	7	\N
12786	712	113	8	\N
12787	712	219	9	\N
12788	712	172	10	\N
12789	712	184	11	\N
12790	712	228	12	\N
12791	712	261	13	\N
12792	712	279	14	\N
12793	712	271	15	\N
12794	712	6	16	\N
12656	706	103	8	\N
12687	707	198	17	\N
12694	708	198	4	\N
12795	712	269	17	\N
12796	712	130	18	\N
12797	712	190	19	\N
12798	712	110	20	\N
12799	713	329	1	\N
12800	713	115	2	\N
12801	713	3	3	\N
12802	713	139	4	\N
12803	713	2	5	\N
12804	713	271	6	\N
12820	714	242	1	\N
12821	714	135	2	\N
12822	714	170	3	\N
12824	714	138	5	\N
12825	714	99	6	\N
12826	714	2	7	\N
12827	714	98	8	\N
12828	714	172	9	\N
12829	714	219	10	\N
12830	714	114	11	\N
12831	714	340	12	\N
12833	714	279	14	\N
12835	714	6	16	\N
12836	714	130	17	\N
12837	714	260	18	\N
12838	714	271	19	\N
12839	714	190	20	\N
12840	714	209	21	\N
12841	715	330	1	\N
12843	715	135	3	\N
12844	715	170	4	\N
12845	715	270	5	\N
12846	715	2	6	\N
12847	715	231	7	\N
10874	605	103	11	\N
12848	715	195	8	\N
10879	605	422	16	\N
16073	1182	285	5	\N
16074	1182	113	6	\N
16075	1182	226	7	\N
16076	1182	38	8	\N
16077	1182	220	9	\N
12842	715	207	2	\N
12832	714	164	13	\N
12834	714	5	15	\N
10893	606	5	8	\N
10881	605	100	18	\N
10882	605	310	19	\N
10884	605	38	21	\N
10885	605	317	22	\N
10775	600	308	1	\N
10776	600	3	2	\N
10777	600	212	3	\N
10778	600	309	4	\N
10779	600	97	5	\N
10780	600	7	6	\N
10781	600	95	7	\N
10782	600	99	8	\N
10783	600	100	9	\N
10784	600	98	10	\N
10785	600	124	11	\N
10786	600	310	12	\N
10787	600	285	13	\N
10788	600	167	14	\N
10789	600	311	15	\N
10790	600	13	16	\N
10791	600	133	17	\N
10793	600	38	19	\N
10794	600	312	20	\N
10795	600	14	21	\N
10796	600	155	22	\N
10797	600	18	23	\N
10798	601	308	1	\N
10799	601	3	2	\N
10800	601	222	3	\N
10801	601	219	4	\N
10802	601	309	5	\N
10803	601	248	6	\N
10804	601	206	7	\N
10805	601	24	8	\N
10806	601	113	9	\N
10807	601	281	10	\N
10808	601	313	11	\N
10809	601	314	12	\N
10810	601	310	13	\N
10811	601	311	14	\N
10812	601	315	15	\N
10813	601	272	16	\N
10814	601	210	17	\N
10817	601	94	20	\N
10818	601	133	21	\N
10819	601	312	22	\N
10820	601	317	23	\N
10821	602	17	1	\N
10822	602	309	2	\N
10823	602	311	3	\N
10824	602	310	4	\N
10825	602	133	5	\N
10827	602	38	7	\N
10828	602	14	8	\N
10829	603	304	1	\N
10830	603	17	2	\N
10831	603	3	3	\N
10832	603	212	4	\N
10833	603	309	5	\N
10834	603	311	6	\N
10835	603	310	7	\N
10836	603	133	8	\N
10838	603	38	10	\N
10839	603	317	11	\N
10840	603	14	12	\N
10841	604	318	1	\N
10842	604	242	2	\N
10843	604	309	3	\N
10844	604	7	4	\N
10845	604	95	5	\N
10846	604	249	6	\N
10847	604	314	7	\N
10848	604	217	8	\N
10849	604	219	9	\N
10850	604	121	10	\N
10853	604	159	13	\N
10854	604	98	14	\N
10855	604	315	15	\N
10856	604	251	16	\N
10857	604	319	17	\N
10858	604	97	18	\N
10859	604	311	19	\N
10860	604	133	20	\N
10861	604	310	21	\N
10862	604	155	22	\N
10863	604	285	23	\N
10864	605	242	1	\N
10865	605	3	2	\N
10866	605	309	3	\N
10867	605	150	4	\N
10868	605	314	5	\N
10869	605	217	6	\N
10870	605	215	7	\N
10871	605	206	8	\N
10872	605	133	9	\N
10873	605	94	10	\N
10875	605	159	12	\N
10876	605	311	13	\N
10877	605	315	14	\N
10878	605	279	15	\N
10886	606	308	1	\N
10887	606	3	2	\N
10888	606	311	3	\N
10889	606	222	4	\N
10890	606	121	5	\N
10891	606	212	6	\N
10892	606	309	7	\N
10894	606	219	9	\N
10895	606	24	10	\N
10896	606	94	11	\N
10897	606	174	12	\N
10898	606	310	13	\N
10899	606	152	14	\N
10900	606	6	15	\N
10901	606	315	16	\N
10902	606	279	17	\N
10903	606	13	18	\N
10904	606	155	19	\N
10905	606	133	20	\N
10907	606	38	22	\N
10908	606	271	23	\N
10909	607	308	1	\N
10910	607	3	2	\N
10911	607	311	3	\N
10912	607	309	4	\N
10913	607	270	5	\N
10914	607	133	6	\N
10915	607	254	7	\N
10916	607	231	8	\N
10917	607	235	9	\N
10918	607	130	10	\N
10919	607	208	11	\N
10921	607	315	13	\N
10922	607	169	14	\N
10923	607	206	15	\N
10924	607	319	16	\N
10925	607	310	17	\N
10927	607	38	19	\N
10928	607	14	20	\N
10929	607	312	21	\N
10930	607	317	22	\N
10931	607	285	23	\N
10932	608	308	1	\N
10933	608	7	2	\N
10934	608	104	3	\N
10935	608	270	4	\N
10936	608	309	5	\N
10937	608	219	6	\N
10938	608	235	7	\N
10939	608	110	8	\N
10940	608	226	9	\N
10941	608	130	10	\N
10942	608	152	11	\N
10943	608	311	12	\N
10944	608	205	13	\N
10945	608	206	14	\N
10946	608	16	15	\N
10947	608	210	16	\N
10948	608	109	17	\N
10949	608	133	18	\N
10950	608	312	19	\N
10951	608	317	20	\N
10952	608	238	21	\N
10954	608	38	23	\N
10955	609	308	1	\N
10956	609	133	2	\N
10957	609	121	3	\N
10958	609	160	4	\N
10959	609	244	5	\N
10960	609	309	6	\N
10961	609	150	7	\N
10962	609	155	8	\N
10963	609	9	9	\N
10964	609	111	10	\N
10965	609	311	11	\N
10966	609	281	12	\N
10967	609	209	13	\N
10968	609	276	14	\N
10969	609	319	15	\N
10971	609	151	17	\N
10972	609	208	18	\N
10973	609	312	19	\N
10974	609	317	20	\N
10975	609	131	21	\N
10976	609	17	22	\N
10977	610	308	1	\N
10978	610	222	2	\N
10979	610	114	3	\N
10980	610	311	4	\N
10981	610	309	5	\N
10982	610	235	6	\N
10983	610	120	7	\N
10984	610	124	8	\N
10985	610	122	9	\N
10986	610	208	10	\N
10987	610	45	11	\N
10988	610	133	12	\N
10989	610	281	13	\N
10990	610	119	14	\N
10991	610	376	15	\N
10992	610	319	16	\N
10999	611	308	1	\N
11000	611	311	2	\N
11001	611	24	3	\N
11002	611	309	4	\N
11003	611	227	5	\N
11004	611	254	6	\N
11005	611	130	7	\N
11006	611	320	8	\N
11007	611	219	9	\N
16078	1183	304	1	\N
11009	611	269	11	\N
11010	611	313	12	\N
11011	611	113	13	\N
11012	611	206	14	\N
11013	611	285	15	\N
11014	611	210	16	\N
11016	611	133	18	\N
11017	611	312	19	\N
11018	611	317	20	\N
11019	611	265	21	\N
11020	611	4	22	\N
11021	612	308	1	\N
11022	612	219	2	\N
11023	612	222	3	\N
11024	612	97	4	\N
11025	612	309	5	\N
16079	1183	17	2	\N
11042	613	308	1	\N
11044	613	24	3	\N
11045	613	121	4	\N
11046	613	309	5	\N
11048	613	254	7	\N
11049	613	317	8	\N
11050	613	313	9	\N
11051	613	281	10	\N
11052	613	311	11	\N
11053	613	133	12	\N
11054	613	130	13	\N
11055	613	112	14	\N
11057	613	319	16	\N
11059	613	115	18	\N
11060	613	312	19	\N
11061	613	231	20	\N
11062	613	131	21	\N
11063	613	14	22	\N
11064	614	308	1	\N
11065	614	309	2	\N
11066	614	114	3	\N
11067	614	202	4	\N
11068	614	281	5	\N
11069	614	148	6	\N
11070	614	206	7	\N
11071	614	311	8	\N
11072	614	317	9	\N
11073	614	208	10	\N
11074	614	119	11	\N
11075	614	209	12	\N
11076	614	313	13	\N
11077	614	210	14	\N
11078	614	7	15	\N
11079	614	94	16	\N
11080	614	133	17	\N
11015	611	163	17	\N
11047	613	201	6	\N
10970	609	103	16	\N
11056	613	198	15	\N
10920	607	207	12	\N
10906	606	277	21	\N
10926	607	277	18	\N
10994	610	226	18	\N
10995	610	312	19	\N
11081	614	312	18	\N
11082	614	271	19	\N
11083	614	238	20	\N
11084	614	17	21	\N
11085	615	308	1	\N
11086	615	24	2	\N
11087	615	94	3	\N
11089	615	309	5	\N
11090	615	254	6	\N
11091	615	120	7	\N
11092	615	121	8	\N
11093	615	219	9	\N
11094	615	213	10	\N
11095	615	113	11	\N
11097	615	9	13	\N
11098	615	313	14	\N
11099	615	171	15	\N
11100	615	279	16	\N
11101	615	311	17	\N
11102	615	133	18	\N
11103	615	312	19	\N
11104	615	317	20	\N
11105	615	130	21	\N
11106	615	14	22	\N
11107	615	18	23	\N
11108	616	222	1	\N
11109	616	97	2	\N
11110	616	142	3	\N
11111	616	309	4	\N
11112	616	270	5	\N
11113	616	254	6	\N
11114	616	45	7	\N
11115	616	2	8	\N
11116	616	122	9	\N
11117	616	8	10	\N
11118	616	124	11	\N
11119	616	281	12	\N
11120	616	110	13	\N
11121	616	235	14	\N
11122	616	319	15	\N
11123	616	311	16	\N
11124	616	133	17	\N
11125	616	312	18	\N
11126	616	317	19	\N
11127	616	131	20	\N
11128	617	323	1	\N
11129	617	309	2	\N
11130	617	311	3	\N
11131	617	12	4	\N
11132	617	130	5	\N
11133	617	381	6	\N
11134	617	38	7	\N
11135	617	14	8	\N
11137	618	308	1	\N
11138	618	311	2	\N
11139	618	3	3	\N
11140	618	309	4	\N
11141	618	138	5	\N
11142	618	312	6	\N
11143	618	102	7	\N
11144	618	113	8	\N
11145	618	174	9	\N
11146	618	247	10	\N
16080	1183	212	3	\N
11148	618	320	12	\N
11149	618	251	13	\N
11150	618	319	14	\N
11151	618	46	15	\N
11152	618	155	16	\N
11153	618	185	17	\N
11154	618	133	18	\N
11155	618	38	19	\N
11156	618	285	20	\N
11157	619	308	1	\N
11158	619	4	2	\N
11159	619	309	3	\N
11160	619	213	4	\N
11161	619	248	5	\N
16081	1183	241	4	\N
11163	619	313	7	\N
11164	619	317	8	\N
11165	619	219	9	\N
11166	619	124	10	\N
11167	619	214	11	\N
11168	619	169	12	\N
11169	619	190	13	\N
11170	619	119	14	\N
11171	619	186	15	\N
11172	619	210	16	\N
11173	619	311	17	\N
11174	619	312	18	\N
11175	619	133	19	\N
11176	619	6	20	\N
11177	619	131	21	\N
11178	620	308	1	\N
11179	620	13	2	\N
11180	620	121	3	\N
11181	620	111	4	\N
11182	620	309	5	\N
11183	620	99	6	\N
11184	620	231	7	\N
11185	620	202	8	\N
11186	620	8	9	\N
11187	620	104	10	\N
11188	620	173	11	\N
11189	620	169	12	\N
11190	620	157	13	\N
11191	620	210	14	\N
11192	620	115	15	\N
11193	620	311	16	\N
11194	620	133	17	\N
11195	620	126	18	\N
11196	620	14	19	\N
11197	620	271	20	\N
11198	621	308	1	\N
11199	621	219	2	\N
11200	621	121	3	\N
11201	621	160	4	\N
11202	621	309	5	\N
11203	621	102	6	\N
11204	621	133	7	\N
16082	1183	285	5	\N
11206	621	4	9	\N
11207	621	130	10	\N
11208	621	9	11	\N
11209	621	269	12	\N
11210	621	119	13	\N
11211	621	272	14	\N
11212	621	319	15	\N
11213	621	6	16	\N
11214	621	311	17	\N
11215	621	312	18	\N
11216	621	317	19	\N
11217	621	98	20	\N
11218	621	131	21	\N
11219	621	18	22	\N
11220	622	308	1	\N
11221	622	219	2	\N
11222	622	121	3	\N
11223	622	160	4	\N
11224	622	309	5	\N
11225	622	102	6	\N
11226	622	133	7	\N
16083	1183	226	6	\N
11228	622	4	9	\N
11229	622	130	10	\N
11230	622	9	11	\N
11231	622	269	12	\N
11232	622	119	13	\N
11233	622	272	14	\N
11234	622	319	15	\N
11235	622	6	16	\N
11236	622	311	17	\N
11237	622	312	18	\N
11238	622	317	19	\N
11239	622	98	20	\N
11240	622	131	21	\N
11241	622	18	22	\N
11242	623	309	1	\N
11243	623	133	2	\N
11244	623	130	3	\N
11245	623	12	4	\N
11246	623	231	5	\N
11247	623	311	6	\N
11248	623	119	7	\N
11249	623	14	8	\N
11250	623	265	9	\N
11251	623	285	10	\N
11252	624	311	1	\N
11253	624	309	2	\N
11254	624	130	3	\N
11255	624	12	4	\N
11256	624	38	5	\N
11257	624	14	6	\N
11258	625	308	1	\N
11259	625	317	2	\N
11260	625	160	3	\N
11261	625	311	4	\N
11262	625	94	5	\N
11263	625	309	6	\N
11264	625	102	7	\N
11265	625	2	8	\N
11096	615	201	12	\N
11136	617	220	9	\N
11267	625	9	10	\N
11268	625	269	11	\N
11270	625	272	13	\N
11271	625	319	14	\N
11272	625	6	15	\N
11273	625	4	16	\N
11274	625	312	17	\N
11275	625	133	18	\N
11276	625	98	19	\N
11277	626	13	1	\N
11278	626	309	2	\N
11279	626	311	3	\N
11280	626	130	4	\N
11281	626	12	5	\N
11282	626	38	6	\N
11283	626	14	7	\N
11284	626	271	8	\N
11285	627	309	1	\N
11286	627	311	2	\N
11287	627	130	3	\N
11288	627	12	4	\N
11289	627	13	5	\N
11290	627	38	6	\N
11291	627	14	7	\N
11292	628	309	1	\N
11293	628	311	2	\N
11294	628	130	3	\N
11295	628	12	4	\N
11296	628	13	5	\N
11297	628	38	6	\N
11298	628	14	7	\N
11299	628	317	8	\N
11300	629	309	1	\N
11301	629	311	2	\N
11302	629	130	3	\N
11303	629	12	4	\N
11304	629	13	5	\N
11305	629	38	6	\N
11306	629	14	7	\N
11307	629	317	8	\N
11308	630	309	1	\N
11309	630	311	2	\N
11310	630	130	3	\N
11311	630	12	4	\N
11312	630	13	5	\N
11313	630	38	6	\N
11314	630	14	7	\N
11315	630	317	8	\N
11316	631	308	1	\N
11317	631	3	2	\N
11318	631	45	3	\N
11319	631	309	4	\N
11320	631	122	5	\N
11321	631	263	6	\N
11322	631	270	7	\N
11323	631	383	8	\N
11324	631	124	9	\N
11325	631	244	10	\N
11326	631	126	11	\N
11328	631	309	13	\N
11329	631	130	14	\N
11330	631	319	15	\N
11331	631	133	16	\N
11332	631	311	17	\N
11333	631	312	18	\N
11334	631	260	19	\N
11335	631	317	20	\N
11336	632	308	1	\N
11337	632	311	2	\N
11338	632	212	3	\N
11339	632	118	4	\N
11340	632	309	5	\N
11341	632	130	6	\N
11342	632	271	7	\N
11343	632	17	8	\N
11344	632	384	9	\N
11345	632	120	10	\N
11346	632	7	11	\N
11348	632	101	13	\N
11349	632	327	14	\N
11350	632	155	15	\N
11351	632	117	16	\N
11352	632	6	17	\N
11353	632	279	18	\N
11354	632	133	19	\N
11355	632	13	20	\N
11356	632	312	21	\N
11357	632	38	22	\N
11358	632	317	23	\N
11359	632	14	24	\N
11360	632	131	25	\N
11361	632	16	26	\N
11362	633	308	1	\N
11363	633	311	2	\N
11364	633	3	3	\N
11365	633	121	4	\N
11366	633	24	5	\N
11367	633	219	6	\N
11368	633	309	7	\N
11369	633	130	8	\N
11370	633	13	9	\N
11371	633	95	10	\N
11372	633	7	11	\N
11373	633	122	12	\N
11374	633	8	13	\N
11375	633	235	14	\N
11376	633	112	15	\N
11377	633	285	16	\N
11378	633	189	17	\N
11379	633	16	18	\N
11380	633	319	19	\N
11381	633	133	20	\N
11382	633	12	21	\N
11383	633	312	22	\N
11385	633	38	24	\N
11386	633	317	25	\N
11387	633	14	26	\N
11388	633	220	27	\N
11389	634	308	1	\N
11390	634	311	2	\N
11391	634	248	3	\N
11392	634	270	4	\N
11393	634	309	5	\N
11394	634	122	6	\N
11384	633	277	23	\N
11396	634	138	8	\N
11397	634	306	9	\N
11398	634	186	10	\N
11399	634	279	11	\N
11400	634	117	12	\N
11401	634	312	13	\N
11402	634	271	14	\N
11403	634	126	15	\N
11404	634	133	16	\N
11405	634	202	17	\N
11406	634	2	18	\N
11407	635	308	1	\N
11408	635	311	2	\N
11409	635	4	3	\N
11410	635	113	4	\N
11426	636	13	1	\N
11427	636	38	2	\N
11428	636	132	3	\N
11429	636	12	4	\N
11430	636	235	5	\N
11431	636	130	6	\N
11432	636	14	7	\N
11433	636	271	8	\N
11434	637	13	1	\N
11435	637	38	2	\N
11436	637	132	3	\N
11437	637	45	4	\N
11438	637	12	5	\N
11439	637	130	6	\N
11440	637	14	7	\N
11441	637	271	8	\N
11442	638	212	1	\N
11443	638	45	2	\N
11444	638	12	3	\N
11445	638	132	4	\N
11446	638	235	5	\N
11447	638	14	6	\N
11448	638	231	7	\N
11449	638	17	8	\N
11450	639	304	1	\N
11269	625	201	12	\N
11327	631	103	12	\N
11266	625	198	9	\N
11347	632	5	12	\N
11412	635	98	6	\N
11451	639	13	2	\N
11452	639	38	3	\N
11453	639	12	4	\N
11454	639	132	5	\N
11455	639	133	6	\N
11456	639	130	7	\N
11457	639	14	8	\N
11458	640	304	1	\N
11459	640	13	2	\N
11460	640	38	3	\N
11461	640	267	4	\N
11462	640	12	5	\N
11463	640	231	6	\N
11464	640	132	7	\N
11465	640	130	8	\N
11466	640	271	9	\N
11467	640	14	10	\N
11468	640	220	11	\N
11469	641	13	1	\N
11470	641	38	2	\N
11471	641	122	3	\N
11472	641	132	4	\N
11473	641	133	5	\N
11474	641	12	6	\N
11475	641	14	7	\N
11476	641	285	8	\N
11477	642	252	1	\N
11478	642	132	2	\N
11479	642	94	3	\N
11480	642	185	4	\N
11481	642	152	5	\N
11482	642	208	6	\N
11483	642	134	7	\N
11484	642	95	8	\N
11485	642	99	9	\N
11486	642	241	10	\N
11488	642	102	12	\N
11489	642	97	13	\N
11490	642	137	14	\N
11491	642	167	15	\N
11492	642	133	16	\N
11493	642	130	17	\N
11494	642	271	18	\N
11495	642	260	19	\N
11496	643	304	1	\N
11497	643	222	2	\N
11498	643	218	3	\N
11499	643	114	4	\N
11500	643	184	5	\N
11502	643	181	7	\N
11503	643	244	8	\N
11504	643	113	9	\N
16084	1183	3	7	\N
16085	1183	198	8	\N
11517	644	304	1	\N
11518	644	222	2	\N
11519	644	328	3	\N
11520	644	132	4	\N
11521	644	94	5	\N
11522	644	6	6	\N
11523	644	17	7	\N
11524	644	263	8	\N
11525	644	95	9	\N
11526	644	152	10	\N
11528	644	269	12	\N
11529	644	171	13	\N
11530	644	279	14	\N
11531	644	212	15	\N
11532	644	133	16	\N
11533	644	130	17	\N
11534	644	231	18	\N
11535	644	155	19	\N
11536	644	285	20	\N
11537	645	242	1	\N
11538	645	270	2	\N
11539	645	132	3	\N
11540	645	114	4	\N
11541	645	185	5	\N
11542	645	235	6	\N
11543	645	124	7	\N
11544	645	12	8	\N
11546	645	187	10	\N
11548	645	98	12	\N
11549	645	119	13	\N
11550	645	265	14	\N
11551	645	279	15	\N
11553	645	126	17	\N
11554	645	133	18	\N
11555	645	14	19	\N
11556	645	131	20	\N
11557	646	304	1	\N
11558	646	212	2	\N
11559	646	270	3	\N
11560	646	17	4	\N
11561	646	94	5	\N
11562	646	152	6	\N
11563	646	3	7	\N
11564	646	122	8	\N
11566	646	105	10	\N
11567	646	269	11	\N
11568	646	7	12	\N
11569	646	119	13	\N
11570	646	279	14	\N
11571	646	132	15	\N
11572	646	133	16	\N
11573	646	4	17	\N
11574	646	102	18	\N
11575	646	231	19	\N
11576	646	285	20	\N
11577	647	252	1	\N
11578	647	132	2	\N
11579	647	114	3	\N
11580	647	185	4	\N
16087	1183	38	10	\N
11582	647	235	6	\N
11583	647	124	7	\N
11584	647	12	8	\N
11585	647	95	9	\N
11586	647	187	10	\N
11587	647	251	11	\N
11588	647	190	12	\N
11589	647	206	13	\N
11590	647	265	14	\N
11591	647	167	15	\N
11593	647	126	17	\N
11594	647	133	18	\N
11595	647	130	19	\N
11596	647	14	20	\N
11597	647	131	21	\N
11598	648	329	1	\N
11599	648	178	2	\N
11600	648	133	3	\N
11601	648	138	4	\N
11602	648	306	5	\N
11603	648	152	6	\N
11604	648	160	7	\N
11605	648	117	8	\N
16088	1183	116	11	\N
11607	648	181	10	\N
11608	648	213	11	\N
11609	648	98	12	\N
11610	648	176	13	\N
11612	648	167	15	\N
11613	648	132	16	\N
11614	648	17	17	\N
11615	648	154	18	\N
11616	648	130	19	\N
11617	648	102	20	\N
11618	648	120	21	\N
11619	649	330	1	\N
11620	649	114	2	\N
11622	649	174	4	\N
11623	649	270	5	\N
11624	649	123	6	\N
11625	649	222	7	\N
11626	649	219	8	\N
11628	649	205	10	\N
11629	649	208	11	\N
11630	649	169	12	\N
11631	649	254	13	\N
11632	649	279	14	\N
11633	649	24	15	\N
11634	649	94	16	\N
11635	649	202	17	\N
11501	643	163	6	\N
11527	644	163	11	\N
11565	646	163	9	\N
11547	645	103	11	\N
11506	643	170	11	\N
16086	1183	277	9	\N
11627	649	5	9	\N
11487	642	145	11	\N
11508	643	269	13	\N
11510	643	127	15	\N
11636	649	132	18	\N
11637	649	133	19	\N
11638	649	153	20	\N
11639	650	304	1	\N
11640	650	114	2	\N
11641	650	218	3	\N
11642	650	222	4	\N
11644	650	181	6	\N
11645	650	185	7	\N
11646	650	244	8	\N
11647	650	182	9	\N
16089	1183	220	12	\N
11651	650	266	13	\N
11652	650	6	14	\N
11654	650	279	16	\N
11655	650	132	17	\N
11656	650	133	18	\N
11657	650	17	19	\N
11658	650	13	20	\N
11659	650	18	21	\N
11660	651	1	1	\N
11661	651	212	2	\N
11663	651	197	4	\N
11664	651	126	5	\N
11665	651	115	6	\N
11666	651	241	7	\N
11667	651	270	8	\N
11678	652	252	1	\N
11679	652	24	2	\N
11680	652	17	3	\N
11681	652	118	4	\N
11682	652	197	5	\N
11683	652	251	6	\N
11684	652	12	7	\N
11685	652	202	8	\N
11686	652	113	9	\N
11687	652	6	10	\N
11688	652	100	11	\N
11689	652	7	12	\N
11690	652	208	13	\N
11691	652	285	14	\N
11692	652	279	15	\N
11693	652	132	16	\N
11694	652	133	17	\N
11695	652	130	18	\N
11696	652	231	19	\N
11697	652	131	20	\N
11698	653	1	1	\N
11699	653	132	2	\N
11700	653	95	3	\N
11701	653	248	4	\N
11702	653	247	5	\N
11703	653	122	6	\N
11704	653	254	7	\N
11705	653	2	8	\N
11706	653	244	9	\N
11707	653	170	10	\N
11708	653	176	11	\N
11709	653	269	12	\N
11710	653	150	13	\N
11711	653	279	14	\N
11713	653	114	16	\N
11714	653	133	17	\N
11716	653	130	19	\N
11717	653	151	20	\N
11718	654	330	1	\N
11719	654	2	2	\N
11720	654	135	3	\N
11721	654	17	4	\N
11722	654	307	5	\N
11723	654	139	6	\N
11724	654	122	7	\N
11725	654	185	8	\N
11726	654	109	9	\N
11728	654	7	11	\N
11729	654	173	12	\N
11730	654	206	13	\N
11731	654	150	14	\N
11732	654	279	15	\N
11733	654	132	16	\N
11734	654	133	17	\N
11735	654	4	18	\N
11737	654	38	20	\N
11738	654	285	21	\N
11739	655	304	1	\N
11740	655	24	2	\N
11741	655	3	3	\N
11742	655	114	4	\N
11743	655	270	5	\N
11744	655	254	6	\N
11745	655	235	7	\N
11746	655	121	8	\N
11747	655	111	9	\N
11748	655	226	10	\N
11749	655	142	11	\N
11750	655	187	12	\N
11751	655	153	13	\N
11753	655	279	15	\N
11754	655	8	16	\N
11755	655	152	17	\N
11756	655	132	18	\N
11757	655	133	19	\N
11758	655	13	20	\N
11759	655	131	21	\N
11760	656	252	1	\N
11761	656	133	2	\N
11762	656	126	3	\N
11763	656	181	4	\N
11764	656	125	5	\N
11765	656	104	6	\N
11767	656	235	8	\N
11768	656	237	9	\N
11769	656	115	10	\N
11770	656	263	11	\N
11771	656	178	12	\N
11772	656	173	13	\N
11773	656	168	14	\N
11774	656	279	15	\N
11775	656	132	16	\N
11777	656	213	18	\N
11778	656	190	19	\N
11779	656	13	20	\N
11780	656	101	21	\N
11781	656	285	22	\N
11782	657	242	1	\N
11783	657	132	2	\N
11784	657	174	3	\N
11785	657	248	4	\N
11786	657	247	5	\N
11787	657	170	6	\N
11788	657	142	7	\N
11789	657	46	8	\N
11790	657	113	9	\N
11806	658	264	1	\N
11807	658	133	2	\N
11808	658	4	3	\N
11809	658	212	4	\N
11811	658	117	6	\N
11812	658	98	7	\N
11813	658	7	8	\N
11814	658	115	9	\N
11815	658	2	10	\N
11816	658	159	11	\N
11817	658	6	12	\N
11818	658	214	13	\N
11819	658	16	14	\N
11820	658	279	15	\N
11643	650	163	5	\N
11670	651	269	11	\N
11766	656	201	7	\N
11810	658	195	5	\N
11648	650	198	10	\N
11649	650	207	11	\N
11712	653	207	15	\N
11776	656	207	17	\N
11671	651	47	12	\N
16090	1184	277	1	\N
11736	654	277	19	\N
11715	653	5	18	\N
11672	651	112	13	\N
11821	658	132	16	\N
11822	658	285	17	\N
11823	658	38	18	\N
11824	658	130	19	\N
11825	658	14	20	\N
11826	658	231	21	\N
11827	658	17	22	\N
11828	659	1	1	\N
11829	659	132	2	\N
11830	659	17	3	\N
11831	659	3	4	\N
11832	659	122	5	\N
11833	659	235	6	\N
11834	659	254	7	\N
11835	659	45	8	\N
11836	659	202	9	\N
11837	659	142	10	\N
11839	659	12	12	\N
11840	659	119	13	\N
11841	659	260	14	\N
11842	659	124	15	\N
11843	659	279	16	\N
11844	659	8	17	\N
11845	659	133	18	\N
11846	659	14	19	\N
11847	659	220	20	\N
11848	660	318	1	\N
11849	660	132	2	\N
11850	660	247	3	\N
11851	660	219	4	\N
11852	660	148	5	\N
11853	660	269	6	\N
11854	660	120	7	\N
11855	660	121	8	\N
11857	660	159	10	\N
11858	660	6	11	\N
11859	660	254	12	\N
11860	660	236	13	\N
11861	660	206	14	\N
11862	660	279	15	\N
11863	660	114	16	\N
11864	660	125	17	\N
11865	660	133	18	\N
11866	660	130	19	\N
11867	660	151	20	\N
11868	660	320	21	\N
11869	660	17	22	\N
12849	715	109	9	\N
12850	715	213	10	\N
12851	715	205	11	\N
12852	715	130	12	\N
12853	715	6	13	\N
12854	715	171	14	\N
12855	715	279	15	\N
12856	715	241	16	\N
12857	715	4	17	\N
12858	715	13	18	\N
12859	715	260	19	\N
12860	715	285	20	\N
12861	716	304	1	\N
12862	716	208	2	\N
12863	716	125	3	\N
12865	716	160	5	\N
12866	716	151	6	\N
12867	716	124	7	\N
12868	716	117	8	\N
12870	716	172	10	\N
12871	716	148	11	\N
12872	716	340	12	\N
12874	716	279	14	\N
12875	716	45	15	\N
12877	716	6	17	\N
12878	716	130	18	\N
12879	716	271	19	\N
12880	716	38	20	\N
12881	717	304	1	\N
12882	717	7	2	\N
12883	717	248	3	\N
12884	717	174	4	\N
12885	717	155	5	\N
12886	717	285	6	\N
12887	717	270	7	\N
12888	717	2	8	\N
12889	717	113	9	\N
12890	717	95	10	\N
12891	717	263	11	\N
12892	717	102	12	\N
12893	717	168	13	\N
12894	717	279	14	\N
12896	717	99	16	\N
12897	717	154	17	\N
12898	717	13	18	\N
12899	717	14	19	\N
12900	718	242	1	\N
12901	718	212	2	\N
12902	718	24	3	\N
12905	718	2	6	\N
12906	718	124	7	\N
12907	718	306	8	\N
12908	718	9	9	\N
12909	718	172	10	\N
12910	718	148	11	\N
12911	718	340	12	\N
12912	718	6	13	\N
12913	718	266	14	\N
12914	718	279	15	\N
16091	1184	38	2	\N
16092	1184	241	3	\N
12917	718	190	18	\N
12918	718	130	19	\N
12919	718	271	20	\N
12920	718	38	21	\N
12921	719	1	1	\N
12922	719	208	2	\N
12923	719	117	3	\N
12924	719	174	4	\N
12925	719	121	5	\N
12926	719	120	6	\N
12927	719	160	7	\N
12928	719	104	8	\N
12929	719	159	9	\N
12930	719	270	10	\N
12931	719	125	11	\N
12932	719	2	12	\N
12933	719	267	13	\N
12934	719	171	14	\N
12935	719	279	15	\N
12936	719	4	16	\N
12937	719	6	17	\N
12938	719	130	18	\N
12939	719	13	19	\N
12940	719	38	20	\N
12941	719	271	21	\N
12942	719	151	22	\N
12943	720	242	1	\N
12944	720	3	2	\N
12945	720	174	3	\N
12946	720	135	4	\N
12947	720	118	5	\N
12948	720	117	6	\N
12949	720	271	7	\N
12950	720	126	8	\N
12951	720	125	9	\N
12952	720	219	10	\N
16093	1184	202	4	\N
12954	720	340	12	\N
12955	720	6	13	\N
12956	720	127	14	\N
16094	1184	231	5	\N
12958	720	285	16	\N
12959	720	2	17	\N
12960	720	233	18	\N
12961	720	130	19	\N
12962	720	260	20	\N
12963	721	4	1	\N
12964	721	130	2	\N
12965	721	99	3	\N
12966	722	242	1	\N
12967	722	212	2	\N
12969	722	2	4	\N
12970	722	4	5	\N
12971	722	113	6	\N
12972	722	17	7	\N
12973	722	235	8	\N
12974	722	283	9	\N
12975	722	102	10	\N
16095	1184	116	6	\N
12977	722	12	12	\N
12978	722	227	13	\N
12979	722	108	14	\N
12980	722	265	15	\N
12981	722	229	16	\N
12982	722	285	17	\N
12983	722	13	18	\N
12984	722	38	19	\N
11838	659	103	11	\N
12876	716	198	16	\N
12873	716	164	13	\N
12895	717	5	15	\N
12869	716	145	9	\N
12904	718	145	5	\N
12985	722	14	20	\N
12986	722	16	21	\N
12987	722	271	22	\N
12988	722	18	23	\N
12989	723	1	1	\N
12990	723	218	2	\N
12991	723	2	3	\N
12992	723	111	4	\N
12993	723	7	5	\N
12994	723	99	6	\N
12995	723	98	7	\N
12996	723	181	8	\N
12997	723	95	9	\N
13012	724	1	1	\N
13013	724	109	2	\N
13014	724	2	3	\N
13015	724	270	4	\N
13016	724	174	5	\N
13017	724	241	6	\N
13018	724	231	7	\N
13019	724	142	8	\N
13020	724	9	9	\N
13021	724	228	10	\N
13022	724	148	11	\N
13023	724	119	12	\N
13024	724	267	13	\N
13025	724	273	14	\N
13026	724	45	15	\N
16096	1184	213	7	\N
13028	724	210	17	\N
13029	724	117	18	\N
13030	724	155	19	\N
13031	724	6	20	\N
13032	724	269	21	\N
13033	724	271	22	\N
13034	724	14	23	\N
13035	724	110	24	\N
13036	725	1	1	\N
13037	725	17	2	\N
13038	725	2	3	\N
16097	1184	3	8	\N
13040	725	241	5	\N
13041	725	38	6	\N
13042	725	98	7	\N
16098	1184	7	9	\N
13060	726	242	1	\N
13061	726	202	2	\N
13062	726	2	3	\N
13063	726	122	4	\N
13064	726	13	5	\N
13065	726	45	6	\N
13066	726	7	7	\N
13067	726	99	8	\N
13068	726	226	9	\N
13069	726	148	10	\N
13070	726	228	11	\N
13071	726	119	12	\N
13072	726	267	13	\N
13073	726	231	14	\N
13074	726	110	15	\N
13075	726	265	16	\N
16099	1184	4	10	\N
13077	726	271	18	\N
13078	726	38	19	\N
13079	726	12	20	\N
13080	726	14	21	\N
13081	726	16	22	\N
13082	726	376	23	\N
13083	727	242	1	\N
13084	727	212	2	\N
13085	727	2	3	\N
13086	727	270	4	\N
13087	727	174	5	\N
13088	727	111	6	\N
13089	727	155	7	\N
13090	727	235	8	\N
13091	727	268	9	\N
13092	727	197	10	\N
13093	727	219	11	\N
13094	727	148	12	\N
13095	727	12	13	\N
13096	727	112	14	\N
13097	727	229	15	\N
13099	727	6	17	\N
13100	727	13	18	\N
13101	727	38	19	\N
13102	727	271	20	\N
13103	727	14	21	\N
13104	727	285	22	\N
13105	728	1	1	\N
13106	728	185	2	\N
13107	728	2	3	\N
13108	728	270	4	\N
13109	728	24	5	\N
13110	728	126	6	\N
13112	728	9	8	\N
13113	728	114	9	\N
13114	728	95	10	\N
13115	728	142	11	\N
13116	728	154	12	\N
13117	728	101	13	\N
13119	728	267	15	\N
13120	728	273	16	\N
16100	1184	285	11	\N
13122	728	271	18	\N
13123	728	6	19	\N
13124	728	269	20	\N
13125	728	38	21	\N
13126	728	14	22	\N
13127	728	272	23	\N
13128	728	110	24	\N
13129	729	242	1	\N
13130	729	13	2	\N
13131	729	292	3	\N
13132	729	212	4	\N
13133	729	38	5	\N
13134	729	12	6	\N
13135	729	14	7	\N
13136	729	271	8	\N
13137	730	1	1	\N
16101	1185	304	1	\N
13139	730	2	3	\N
13140	730	270	4	\N
13141	730	114	5	\N
13143	730	46	7	\N
13144	730	173	8	\N
13145	730	9	9	\N
13146	730	208	10	\N
13147	730	267	11	\N
13148	730	273	12	\N
13149	730	276	13	\N
16102	1185	3	2	\N
13151	730	271	15	\N
13152	730	6	16	\N
13153	730	269	17	\N
13154	730	13	18	\N
13155	730	14	19	\N
13156	730	272	20	\N
13157	730	217	21	\N
13158	731	1	1	\N
13159	731	4	2	\N
13160	731	2	3	\N
13161	731	270	4	\N
13162	731	8	5	\N
13163	731	268	6	\N
13164	731	231	7	\N
13165	731	152	8	\N
13166	731	120	9	\N
13167	731	235	10	\N
13168	731	95	11	\N
13169	731	267	12	\N
13111	728	195	7	\N
12999	723	159	11	\N
13001	723	169	13	\N
13098	727	5	16	\N
13170	731	273	13	\N
13171	731	106	14	\N
16103	1185	17	3	\N
13173	731	271	16	\N
13174	731	6	17	\N
13175	731	269	18	\N
13176	731	13	19	\N
13177	731	38	20	\N
13178	731	14	21	\N
13179	731	209	22	\N
13181	732	1	1	\N
13182	732	212	2	\N
13183	732	2	3	\N
13184	732	270	4	\N
13185	732	94	5	\N
13186	732	268	6	\N
13187	732	45	7	\N
13188	732	9	8	\N
13189	732	227	9	\N
13190	732	142	10	\N
13191	732	95	11	\N
13192	732	267	12	\N
13193	732	273	13	\N
13194	732	186	14	\N
16104	1185	241	4	\N
13196	732	271	16	\N
13197	732	6	17	\N
13198	732	269	18	\N
13199	732	13	19	\N
13200	732	14	20	\N
13201	732	220	21	\N
13202	732	108	22	\N
13203	733	1	1	\N
13204	733	24	2	\N
13205	733	2	3	\N
13206	733	270	4	\N
13207	733	154	5	\N
13208	733	268	6	\N
13209	733	190	7	\N
13210	733	9	8	\N
16105	1185	226	5	\N
13227	734	1	1	\N
13228	734	202	2	\N
13229	734	2	3	\N
13230	734	270	4	\N
13231	734	268	5	\N
13232	734	260	6	\N
13233	734	235	7	\N
13234	734	142	8	\N
13235	734	148	9	\N
13236	734	267	10	\N
13237	734	273	11	\N
13238	734	110	12	\N
13239	734	45	13	\N
16106	1185	227	6	\N
13241	734	210	15	\N
13242	734	285	16	\N
13243	734	13	17	\N
13244	734	6	18	\N
13245	734	271	19	\N
13246	734	269	20	\N
13247	734	14	21	\N
13248	734	112	22	\N
13249	735	1	1	\N
13250	735	113	2	\N
13251	735	2	3	\N
13252	735	270	4	\N
13253	735	118	5	\N
13254	735	268	6	\N
13255	735	254	7	\N
13256	735	109	8	\N
13257	735	9	9	\N
13258	735	148	10	\N
13259	735	228	11	\N
13260	735	267	12	\N
13261	735	273	13	\N
13262	735	272	14	\N
13264	735	271	16	\N
13265	735	6	17	\N
13266	735	269	18	\N
13267	735	265	19	\N
13268	735	14	20	\N
13269	735	110	21	\N
13270	736	1	1	\N
13271	736	121	2	\N
13272	736	2	3	\N
13273	736	270	4	\N
13274	736	4	5	\N
13275	736	268	6	\N
13276	736	235	7	\N
13277	736	3	8	\N
13278	736	160	9	\N
13279	736	107	10	\N
13281	736	267	12	\N
13282	736	273	13	\N
13283	736	238	14	\N
16108	1185	38	8	\N
13285	736	271	16	\N
13286	736	6	17	\N
13287	736	269	18	\N
13288	736	38	19	\N
13289	736	14	20	\N
13290	736	265	21	\N
13291	736	272	22	\N
13292	737	1	1	\N
13293	737	115	2	\N
13294	737	2	3	\N
13295	737	270	4	\N
13296	737	268	5	\N
13297	737	118	6	\N
13298	737	235	7	\N
13299	737	9	8	\N
13300	737	142	9	\N
13301	737	228	10	\N
13302	737	6	11	\N
13303	737	12	12	\N
13304	737	267	13	\N
13305	737	142	14	\N
13306	737	127	15	\N
13307	737	273	16	\N
16109	1185	116	9	\N
13309	737	271	18	\N
13310	737	190	19	\N
13311	737	269	20	\N
13312	737	13	21	\N
13313	737	14	22	\N
13314	737	272	23	\N
13315	738	242	1	\N
13316	738	13	2	\N
13317	738	2	3	\N
13318	738	270	4	\N
13319	738	45	5	\N
13320	738	38	6	\N
13321	738	12	7	\N
13322	738	14	8	\N
13323	738	271	9	\N
13324	738	265	10	\N
13325	738	220	11	\N
13326	739	1	1	\N
13327	739	2	2	\N
13328	739	114	3	\N
13329	739	111	4	\N
13330	739	270	5	\N
13331	739	268	6	\N
13332	739	138	7	\N
13333	739	9	8	\N
13334	739	190	9	\N
13335	739	6	10	\N
13336	739	152	11	\N
13337	739	181	12	\N
13338	739	260	13	\N
13339	739	267	14	\N
13340	739	273	15	\N
13341	739	265	16	\N
16110	1185	220	10	\N
13343	739	155	18	\N
13344	739	13	19	\N
13345	739	269	20	\N
13346	739	16	21	\N
13347	739	14	22	\N
13348	739	271	23	\N
13349	740	242	1	\N
13350	740	24	2	\N
13351	740	2	3	\N
13352	740	114	4	\N
13353	740	111	5	\N
13354	740	270	6	\N
13280	736	360	11	\N
13212	733	228	10	\N
13213	733	6	11	\N
13214	733	267	12	\N
13355	740	38	7	\N
13356	740	117	8	\N
13358	740	122	10	\N
13360	740	234	12	\N
13361	740	267	13	\N
13362	740	110	14	\N
16111	1186	17	1	\N
13364	740	6	16	\N
13365	740	13	17	\N
13366	740	269	18	\N
13367	740	14	19	\N
13368	740	271	20	\N
13369	740	285	21	\N
13370	741	242	1	\N
13371	741	24	2	\N
13372	741	2	3	\N
13373	741	17	4	\N
13374	741	109	5	\N
13375	741	270	6	\N
13376	741	268	7	\N
13377	741	117	8	\N
13378	741	126	9	\N
13379	741	235	10	\N
13380	741	6	11	\N
13381	741	267	12	\N
13382	741	273	13	\N
13383	741	45	14	\N
16112	1186	202	2	\N
13385	741	285	16	\N
13386	741	13	17	\N
13387	741	38	18	\N
13388	741	269	19	\N
13389	741	14	20	\N
13390	741	271	21	\N
13391	742	1	1	\N
13392	742	2	2	\N
13393	742	3	3	\N
13394	742	114	4	\N
13395	742	111	5	\N
13396	742	270	6	\N
13397	742	268	7	\N
13398	742	9	8	\N
13399	742	126	9	\N
13400	742	6	10	\N
13401	742	267	11	\N
13402	742	122	12	\N
13403	742	273	13	\N
13404	742	265	14	\N
16113	1186	213	3	\N
13406	742	260	16	\N
13407	742	13	17	\N
13408	742	8	18	\N
13409	742	12	19	\N
13410	742	269	20	\N
13411	742	16	21	\N
13412	742	14	22	\N
13413	742	271	23	\N
13414	743	1	1	\N
13415	743	6	2	\N
13416	743	114	3	\N
13417	743	111	4	\N
13418	743	270	5	\N
13419	743	268	6	\N
13420	743	120	7	\N
13421	743	212	8	\N
13422	743	126	9	\N
13423	743	9	10	\N
13424	743	122	11	\N
13425	743	260	12	\N
13426	743	273	13	\N
13427	743	265	14	\N
16114	1186	227	4	\N
13429	743	2	16	\N
13430	743	8	17	\N
13431	743	267	18	\N
13432	743	269	19	\N
13433	743	16	20	\N
13434	743	14	21	\N
13435	743	13	22	\N
13436	743	271	23	\N
13437	744	2	1	\N
13438	744	111	2	\N
13439	744	114	3	\N
13440	744	270	4	\N
13441	744	13	5	\N
13442	744	38	6	\N
13443	744	14	7	\N
13444	744	271	8	\N
13445	744	260	9	\N
13446	745	1	1	\N
13447	745	24	2	\N
13448	745	111	3	\N
13449	745	118	4	\N
13450	745	3	5	\N
13451	745	114	6	\N
13452	745	268	7	\N
13453	745	6	8	\N
13454	745	269	9	\N
13455	745	231	10	\N
13456	745	218	11	\N
13457	745	246	12	\N
13458	745	261	13	\N
13460	745	2	15	\N
13461	745	270	16	\N
13462	745	13	17	\N
13463	745	285	18	\N
13464	745	14	19	\N
13465	745	271	20	\N
13466	746	13	1	\N
13467	746	45	2	\N
13468	746	38	3	\N
13469	746	12	4	\N
13470	746	14	5	\N
13471	746	271	6	\N
13472	746	265	7	\N
13473	746	16	8	\N
13474	747	17	1	\N
13475	747	45	2	\N
13476	747	38	3	\N
13477	747	12	4	\N
13478	747	13	5	\N
13479	747	14	6	\N
13480	747	271	7	\N
13481	748	1	1	\N
13482	748	212	2	\N
13483	748	3	3	\N
13484	748	17	4	\N
13485	748	114	5	\N
13486	748	24	6	\N
13487	748	268	7	\N
13488	748	2	8	\N
13489	748	118	9	\N
13490	748	115	10	\N
13491	748	94	11	\N
13492	748	235	12	\N
13493	748	111	13	\N
13494	748	113	14	\N
13495	748	214	15	\N
13496	748	6	16	\N
13497	748	210	17	\N
13499	748	260	19	\N
13500	748	270	20	\N
13501	748	12	21	\N
13502	748	13	22	\N
13504	748	38	24	\N
13505	748	14	25	\N
13506	748	271	26	\N
13507	748	16	27	\N
13508	748	18	28	\N
13509	749	1	1	\N
13510	749	2	2	\N
13511	749	3	3	\N
13512	749	17	4	\N
13513	749	4	5	\N
13515	749	38	7	\N
13516	749	231	8	\N
13517	749	7	9	\N
13518	749	8	10	\N
13519	749	9	11	\N
16116	1186	212	6	\N
13521	749	109	13	\N
13522	749	235	14	\N
13523	749	285	15	\N
13524	749	399	16	\N
13525	749	210	17	\N
13526	749	267	18	\N
13527	749	269	19	\N
13528	749	6	20	\N
13529	749	270	21	\N
13530	749	12	22	\N
13531	749	13	23	\N
13532	749	14	24	\N
13533	749	271	25	\N
13534	749	265	26	\N
13535	749	18	27	\N
13536	750	242	1	\N
13537	750	181	2	\N
13538	750	117	3	\N
13539	750	248	4	\N
13357	740	198	9	\N
13503	748	277	23	\N
13514	749	5	6	\N
13540	750	270	5	\N
13541	750	122	6	\N
13542	750	46	7	\N
13543	750	2	8	\N
13544	750	258	9	\N
13545	750	205	10	\N
13548	750	118	13	\N
13549	750	260	14	\N
13550	750	269	15	\N
13551	750	271	16	\N
13552	750	270	17	\N
13553	751	267	1	\N
13554	752	242	1	\N
13555	752	271	2	\N
13556	752	160	3	\N
13557	752	24	4	\N
13558	752	187	5	\N
13559	752	120	6	\N
13560	752	3	7	\N
13561	752	38	8	\N
13562	752	2	9	\N
13563	752	384	10	\N
13564	752	263	11	\N
13565	752	214	12	\N
13569	752	126	16	\N
13570	752	269	17	\N
13571	752	14	18	\N
13572	753	2	1	\N
13573	754	242	1	\N
13574	754	24	2	\N
13575	754	248	3	\N
13576	754	126	4	\N
13577	754	38	5	\N
13578	754	231	6	\N
13579	754	173	7	\N
13580	754	17	8	\N
13581	754	263	9	\N
13582	754	100	10	\N
13583	754	265	11	\N
16118	1186	38	8	\N
13585	754	212	13	\N
13586	754	12	14	\N
13587	754	4	15	\N
13588	754	260	16	\N
13589	754	271	17	\N
13590	755	212	1	\N
13591	755	38	2	\N
13592	755	13	3	\N
13593	755	12	4	\N
13594	755	45	5	\N
13595	755	231	6	\N
13596	755	265	7	\N
13597	755	14	8	\N
13598	755	271	9	\N
13599	756	46	1	\N
13600	756	38	2	\N
13601	756	13	3	\N
13602	756	12	4	\N
13603	756	45	5	\N
13604	756	231	6	\N
13605	756	265	7	\N
13606	756	14	8	\N
13607	756	220	9	\N
13608	756	271	10	\N
13609	757	242	1	\N
13610	757	126	2	\N
13611	757	46	3	\N
13612	757	263	4	\N
13613	757	38	5	\N
13614	757	400	6	\N
13615	757	4	7	\N
13616	757	231	8	\N
13617	757	401	9	\N
13618	757	100	10	\N
13619	757	47	11	\N
13620	757	174	12	\N
13621	757	271	13	\N
16119	1186	3	9	\N
13623	757	187	15	\N
13625	757	210	17	\N
13626	757	124	18	\N
13627	757	3	19	\N
13628	757	285	20	\N
13629	757	13	21	\N
13630	757	260	22	\N
13631	757	14	23	\N
13632	758	212	1	\N
13633	758	174	2	\N
13634	758	122	3	\N
13635	758	303	4	\N
13636	758	38	5	\N
13637	758	45	6	\N
13638	758	226	7	\N
13639	758	47	8	\N
13640	758	265	9	\N
13641	758	231	10	\N
13642	758	13	11	\N
13643	758	14	12	\N
13644	758	155	13	\N
13645	759	304	1	\N
13646	759	94	2	\N
13648	759	138	4	\N
13649	759	160	5	\N
13650	759	102	6	\N
13651	759	185	7	\N
13652	759	197	8	\N
13653	759	7	9	\N
13654	759	126	10	\N
13655	759	46	11	\N
13656	759	285	12	\N
13657	759	246	13	\N
13658	759	171	14	\N
13659	759	229	15	\N
13660	759	99	16	\N
13661	759	109	17	\N
13662	759	114	18	\N
13663	759	4	19	\N
13664	759	155	20	\N
13666	759	7	22	\N
13667	760	242	1	\N
13668	760	202	2	\N
13669	760	174	3	\N
13670	760	170	4	\N
13671	760	306	5	\N
13672	760	13	6	\N
13673	760	38	7	\N
13674	760	113	8	\N
13675	760	115	9	\N
13676	760	187	10	\N
13677	760	307	11	\N
16120	1186	220	10	\N
13679	760	150	13	\N
13680	760	265	14	\N
16121	1187	304	1	\N
13682	760	190	16	\N
13683	760	260	17	\N
13684	760	14	18	\N
13685	760	271	19	\N
13686	760	16	20	\N
13687	761	304	1	\N
13688	761	174	2	\N
13689	761	212	3	\N
13690	761	17	4	\N
13691	761	306	5	\N
13692	761	197	6	\N
13693	761	7	7	\N
13694	761	102	8	\N
13695	761	142	9	\N
13696	761	248	10	\N
13697	761	126	11	\N
13698	761	13	12	\N
13699	761	159	13	\N
13700	761	246	14	\N
13701	761	229	15	\N
13702	761	160	16	\N
13703	761	114	17	\N
13704	761	178	18	\N
13705	761	38	19	\N
13706	761	260	20	\N
13707	762	242	1	\N
16122	1187	109	2	\N
13709	762	181	3	\N
13710	762	107	4	\N
13711	762	111	5	\N
13712	762	120	6	\N
13713	762	115	7	\N
13714	762	170	8	\N
13715	762	7	9	\N
13716	762	307	10	\N
13717	762	187	11	\N
13718	762	46	12	\N
13719	762	150	13	\N
13720	762	265	14	\N
16123	1187	212	3	\N
13722	762	185	16	\N
13723	762	202	17	\N
13724	762	155	18	\N
13624	757	116	16	\N
13568	752	103	15	\N
13547	750	195	12	\N
13665	759	198	21	\N
16117	1186	277	7	\N
13725	762	14	19	\N
13726	762	271	20	\N
13727	763	242	1	\N
13728	763	13	2	\N
13729	763	24	3	\N
13730	763	107	4	\N
13731	763	142	5	\N
13732	763	120	6	\N
13733	763	115	7	\N
13734	763	170	8	\N
13735	763	307	9	\N
13737	763	187	11	\N
13738	763	46	12	\N
13739	763	261	13	\N
13740	763	171	14	\N
13742	763	185	16	\N
13743	763	202	17	\N
13744	763	260	18	\N
13745	763	14	19	\N
13746	763	271	20	\N
13747	763	155	21	\N
13748	764	304	1	\N
13749	764	212	2	\N
13750	764	17	3	\N
13751	764	306	4	\N
13752	764	197	5	\N
13753	764	7	6	\N
13754	764	184	7	\N
13755	764	181	8	\N
13758	764	159	11	\N
13759	764	102	12	\N
13760	764	150	13	\N
13761	764	112	14	\N
13762	764	229	15	\N
13763	764	185	16	\N
13764	764	113	17	\N
13765	764	4	18	\N
13766	764	38	19	\N
13767	764	178	20	\N
13768	764	271	21	\N
13769	767	38	1	\N
13770	767	13	2	\N
13771	767	226	3	\N
13772	767	231	4	\N
13773	767	45	5	\N
13774	767	46	6	\N
13775	767	14	7	\N
13776	767	265	8	\N
11008	611	192	10	\N
11545	645	192	9	\N
11581	647	192	5	\N
11606	648	192	9	\N
11650	650	192	12	\N
11662	651	192	3	\N
13567	752	192	14	\N
13622	757	192	14	\N
13678	760	192	12	\N
13708	762	192	2	\N
13736	763	192	10	\N
13757	764	192	10	\N
12739	710	163	6	\N
10815	601	163	18	\N
12915	718	163	16	\N
11922	663	116	9	\N
12063	670	116	10	\N
12125	673	116	10	\N
12164	675	116	10	\N
12370	684	116	10	\N
10816	601	116	19	\N
10852	604	116	12	\N
11147	618	116	11	\N
11395	634	116	7	\N
10851	604	239	11	\N
13039	725	239	4	\N
13138	730	239	2	\N
11162	619	201	6	\N
11205	621	201	8	\N
11227	622	201	8	\N
12745	710	103	12	\N
13520	749	103	12	\N
12410	686	195	5	\N
12254	679	198	10	\N
12737	710	198	4	\N
12781	712	198	3	\N
12916	718	198	17	\N
12953	720	198	11	\N
12976	722	198	11	\N
11507	643	192	12	\N
13823	795	38	1	\N
13824	795	45	2	\N
13826	795	258	4	\N
13827	795	13	5	\N
13828	795	14	6	\N
13829	795	265	7	\N
13830	796	38	1	\N
13831	796	45	2	\N
13832	796	46	3	\N
13833	796	12	4	\N
13834	796	13	5	\N
13835	796	14	6	\N
13825	795	257	3	\N
12957	720	402	15	\N
13027	724	402	16	\N
11509	643	192	14	\N
13076	726	402	17	\N
13121	728	402	17	\N
13150	730	402	14	\N
13172	731	402	15	\N
13195	732	402	15	\N
11880	661	116	11	\N
13240	734	402	14	\N
13263	735	402	15	\N
13284	736	402	15	\N
13308	737	402	17	\N
13342	739	402	17	\N
13363	740	402	15	\N
13384	741	402	15	\N
13405	742	402	15	\N
13428	743	402	15	\N
13459	745	402	14	\N
13584	754	402	12	\N
13681	760	402	15	\N
13721	762	402	15	\N
13741	763	402	15	\N
13756	764	207	9	\N
10880	605	163	17	\N
11035	612	163	15	\N
13051	725	402	16	\N
13217	733	402	15	\N
13867	831	264	1	\N
13868	831	258	2	\N
13869	831	7	3	\N
13870	831	151	4	\N
13871	831	190	5	\N
13872	831	181	6	\N
13873	831	45	7	\N
13874	831	113	8	\N
13875	831	95	9	\N
13876	831	152	10	\N
13877	831	100	11	\N
13878	831	263	12	\N
13879	831	261	13	\N
13880	831	262	14	\N
13881	831	210	15	\N
13882	831	109	16	\N
13883	831	13	17	\N
13885	831	38	19	\N
13886	831	14	20	\N
13887	831	260	21	\N
13888	831	18	22	\N
13889	832	264	1	\N
13890	832	155	2	\N
13891	832	124	3	\N
13892	832	248	4	\N
13893	832	122	5	\N
13894	832	45	6	\N
13895	832	16	7	\N
13896	832	205	8	\N
13897	832	152	9	\N
13898	832	263	10	\N
13899	832	46	11	\N
13900	832	276	12	\N
13901	832	261	13	\N
13902	832	262	14	\N
13903	832	253	15	\N
13904	832	120	16	\N
13905	832	13	17	\N
13907	832	38	19	\N
13908	832	14	20	\N
13909	832	260	21	\N
13910	836	14	1	\N
13911	847	252	1	\N
13912	847	45	2	\N
13913	847	248	3	\N
13914	847	46	4	\N
13915	847	258	5	\N
13916	847	13	6	\N
13917	847	38	7	\N
13918	847	16	8	\N
13919	847	14	9	\N
13920	860	14	1	\N
13922	869	404	1	\N
13923	869	17	2	\N
13924	869	7	3	\N
13925	869	100	4	\N
13926	869	101	5	\N
13927	869	248	6	\N
13928	869	254	7	\N
13929	869	103	8	\N
13930	869	125	9	\N
13931	869	258	10	\N
13933	869	231	12	\N
13934	869	405	13	\N
13935	869	255	14	\N
13936	869	246	15	\N
13937	869	253	16	\N
13938	869	13	17	\N
13939	869	38	18	\N
13940	869	16	19	\N
13941	869	14	20	\N
13942	869	285	21	\N
13943	870	404	1	\N
13944	870	7	2	\N
13945	870	100	3	\N
13946	870	104	4	\N
13947	870	101	5	\N
13948	870	248	6	\N
13949	870	254	7	\N
13950	870	103	8	\N
13951	870	125	9	\N
13952	870	258	10	\N
13954	870	231	12	\N
13955	870	405	13	\N
13956	870	255	14	\N
13957	870	186	15	\N
13958	870	253	16	\N
13959	870	13	17	\N
13960	870	38	18	\N
13961	870	16	19	\N
13962	870	14	20	\N
13963	870	285	21	\N
13964	871	252	1	\N
13965	871	219	2	\N
13966	871	3	3	\N
13967	871	155	4	\N
13968	871	4	5	\N
13969	871	126	6	\N
13970	871	254	7	\N
13971	871	125	8	\N
13972	871	258	9	\N
13973	871	117	10	\N
13974	871	244	11	\N
13975	871	169	12	\N
13976	871	198	13	\N
13977	871	255	14	\N
13978	871	246	15	\N
13979	871	253	16	\N
13980	871	13	17	\N
13981	871	38	18	\N
13982	871	248	19	\N
13983	871	16	20	\N
13984	871	14	21	\N
13985	881	252	1	\N
13986	881	111	2	\N
13987	881	213	3	\N
13988	881	248	4	\N
13989	881	247	5	\N
13990	881	24	6	\N
14001	882	252	1	\N
14002	882	125	2	\N
14003	882	115	3	\N
14004	882	4	4	\N
14005	882	227	5	\N
14006	882	124	6	\N
14007	882	126	7	\N
14008	882	172	8	\N
14009	882	173	9	\N
14010	882	228	10	\N
14011	882	215	11	\N
14012	882	253	12	\N
14013	882	17	13	\N
14014	882	13	14	\N
14015	882	16	15	\N
14016	882	220	16	\N
14017	883	252	1	\N
14018	883	212	2	\N
14019	883	248	3	\N
14020	883	122	4	\N
14021	883	94	5	\N
14022	883	126	6	\N
14023	883	231	7	\N
14024	883	3	8	\N
14025	883	46	9	\N
14026	883	218	10	\N
14027	883	171	11	\N
14028	883	253	12	\N
14029	883	13	13	\N
14030	883	16	14	\N
13921	860	257	2	\N
13884	831	277	18	\N
13906	832	277	18	\N
13991	881	422	7	\N
13992	881	237	8	\N
13993	881	120	9	\N
13994	881	246	10	\N
13995	881	253	11	\N
13996	881	114	12	\N
13997	881	13	13	\N
13998	881	16	14	\N
13999	881	4	15	\N
14000	881	231	16	\N
14031	883	285	15	\N
14032	883	18	16	\N
14033	884	126	1	\N
14034	885	252	1	\N
14035	885	406	2	\N
14036	885	17	3	\N
14037	885	248	4	\N
14038	885	247	5	\N
14039	885	122	6	\N
14040	885	117	7	\N
14041	885	113	8	\N
14042	885	135	9	\N
14043	885	115	10	\N
14044	885	195	11	\N
14045	885	46	12	\N
14046	885	103	13	\N
14047	885	119	14	\N
14048	885	155	15	\N
14049	885	210	16	\N
14050	885	24	17	\N
14051	885	13	18	\N
14053	885	38	20	\N
14054	885	16	21	\N
14055	885	220	22	\N
14056	892	252	1	\N
14057	892	46	2	\N
14058	892	248	3	\N
14059	892	247	4	\N
14060	892	118	5	\N
14061	892	122	6	\N
14062	892	125	7	\N
14063	892	3	8	\N
14064	892	12	9	\N
14065	892	47	10	\N
14066	892	124	11	\N
14067	892	249	12	\N
14068	892	246	13	\N
14069	892	210	14	\N
14070	892	212	15	\N
14071	892	13	16	\N
14073	892	38	18	\N
14074	892	16	19	\N
14075	892	285	20	\N
14076	893	252	1	\N
14077	893	212	2	\N
14078	893	46	3	\N
14079	893	248	4	\N
14080	893	247	5	\N
14081	893	3	6	\N
14082	893	7	7	\N
14083	893	100	8	\N
14084	893	122	9	\N
14085	893	4	10	\N
14086	893	159	11	\N
14087	893	94	12	\N
14088	893	97	13	\N
14089	893	173	14	\N
14090	893	384	15	\N
14091	893	101	16	\N
14093	893	210	18	\N
14094	893	155	19	\N
14095	893	13	20	\N
14097	893	38	22	\N
14098	893	16	23	\N
14099	893	285	24	\N
14100	893	18	25	\N
14101	894	252	1	\N
14102	894	125	2	\N
14103	894	248	3	\N
14104	894	247	4	\N
14105	894	123	5	\N
14106	894	3	6	\N
14107	894	184	7	\N
14108	894	122	8	\N
14109	894	155	9	\N
14110	894	124	10	\N
14111	894	244	11	\N
14112	894	12	12	\N
14113	894	46	13	\N
14114	894	47	14	\N
14115	894	249	15	\N
14116	894	246	16	\N
14119	894	245	19	\N
14120	894	13	20	\N
14122	894	38	22	\N
14123	894	16	23	\N
14124	894	251	24	\N
14125	894	285	25	\N
14126	898	252	1	\N
14127	898	212	2	\N
14128	898	118	3	\N
14129	898	8	4	\N
14130	898	248	5	\N
14131	898	247	6	\N
14132	898	231	7	\N
14133	898	122	8	\N
14134	898	4	9	\N
14135	898	94	10	\N
14136	898	24	11	\N
14138	898	244	13	\N
14139	898	12	14	\N
14140	898	46	15	\N
14142	898	245	17	\N
14143	898	249	18	\N
14144	898	214	19	\N
14145	898	155	20	\N
14146	898	3	21	\N
14147	898	13	22	\N
14149	898	38	24	\N
14150	898	16	25	\N
14151	898	285	26	\N
14152	898	220	27	\N
14153	898	18	28	\N
14154	901	16	1	\N
14155	907	242	1	\N
14156	907	13	2	\N
14157	907	122	3	\N
14158	907	12	4	\N
14160	907	38	6	\N
14161	907	124	7	\N
14162	907	285	8	\N
14163	907	231	9	\N
14164	909	242	1	\N
14165	909	13	2	\N
14166	909	122	3	\N
14167	909	12	4	\N
14168	909	124	5	\N
14170	909	38	7	\N
14171	909	285	8	\N
14172	909	220	9	\N
14173	916	242	1	\N
14174	916	13	2	\N
14175	916	122	3	\N
14176	916	12	4	\N
14177	916	124	5	\N
14179	916	38	7	\N
14180	916	285	8	\N
14181	918	242	1	\N
14182	918	13	2	\N
14183	918	3	3	\N
14184	918	118	4	\N
14185	918	122	5	\N
14186	918	234	6	\N
14187	918	12	7	\N
14188	918	119	8	\N
14189	918	101	9	\N
14190	918	285	10	\N
14191	918	210	11	\N
14192	918	124	12	\N
14193	918	410	13	\N
14194	918	8	14	\N
14196	918	38	16	\N
14197	918	220	17	\N
14198	918	231	18	\N
14199	925	242	1	\N
14200	925	17	2	\N
14201	925	212	3	\N
14202	925	122	4	\N
14203	925	124	5	\N
14204	925	119	6	\N
14205	925	12	7	\N
14206	925	13	8	\N
14208	925	38	10	\N
14209	925	285	11	\N
14210	927	242	1	\N
14211	927	212	2	\N
14212	927	122	3	\N
14213	927	12	4	\N
14214	927	234	5	\N
14215	927	13	6	\N
14092	893	177	17	\N
14052	885	277	19	\N
14137	898	5	12	\N
14217	927	38	8	\N
14218	927	124	9	\N
14219	927	285	10	\N
14220	928	242	1	\N
14221	928	13	2	\N
14222	928	123	3	\N
14223	928	12	4	\N
14224	928	122	5	\N
14225	928	119	6	\N
14226	928	246	7	\N
14227	928	410	8	\N
14229	928	38	10	\N
14230	928	124	11	\N
14231	939	242	1	\N
14232	939	124	2	\N
14233	939	3	3	\N
14234	939	174	4	\N
14235	939	118	5	\N
14236	939	104	6	\N
14237	939	237	7	\N
14238	939	121	8	\N
14239	939	94	9	\N
14240	939	152	10	\N
14241	939	239	11	\N
14242	939	122	12	\N
14243	939	123	13	\N
14244	939	244	14	\N
14245	939	12	15	\N
14246	939	151	16	\N
14247	939	285	17	\N
14248	939	245	18	\N
14249	939	117	19	\N
14250	939	4	20	\N
14251	939	155	21	\N
14252	939	8	22	\N
14254	939	38	24	\N
14255	939	231	25	\N
14256	961	121	1	\N
14257	961	118	2	\N
14258	961	12	3	\N
14259	961	122	4	\N
14260	961	101	5	\N
14261	961	8	6	\N
14263	961	38	8	\N
14264	961	124	9	\N
14265	961	231	10	\N
14266	969	242	1	\N
14267	969	121	2	\N
14268	969	3	3	\N
14269	969	118	4	\N
14270	969	122	5	\N
14272	969	231	7	\N
14273	969	24	8	\N
14274	969	244	9	\N
14275	969	198	10	\N
14276	969	9	11	\N
14277	969	12	12	\N
14278	969	119	13	\N
14279	969	236	14	\N
14280	969	186	15	\N
14281	969	245	16	\N
14282	969	4	17	\N
14283	969	8	18	\N
14285	969	38	20	\N
14286	969	120	21	\N
14287	969	190	22	\N
14288	969	124	23	\N
14289	969	220	24	\N
14290	969	18	25	\N
14291	1024	3	1	\N
14292	1024	118	2	\N
14293	1024	120	3	\N
14294	1024	12	4	\N
14296	1024	38	6	\N
14297	1024	8	7	\N
14298	1024	119	8	\N
14299	1024	220	9	\N
14301	1048	17	2	\N
14302	1048	117	3	\N
14303	1048	121	4	\N
14304	1048	118	5	\N
14305	1048	12	6	\N
14306	1048	119	7	\N
14308	1048	38	9	\N
14309	1048	220	10	\N
14310	1049	242	1	\N
14311	1049	17	2	\N
14312	1049	117	3	\N
14313	1049	118	4	\N
14314	1049	12	5	\N
14315	1049	119	6	\N
14317	1049	38	8	\N
14318	1049	220	9	\N
14319	1058	121	1	\N
14320	1094	118	1	\N
14321	1094	117	2	\N
14322	1094	212	3	\N
14323	1094	233	4	\N
14324	1094	115	5	\N
14325	1094	238	6	\N
14326	1094	198	7	\N
14327	1094	120	8	\N
14328	1094	17	9	\N
14329	1094	231	10	\N
14330	1094	119	11	\N
14331	1094	376	12	\N
14332	1094	327	13	\N
14333	1094	210	14	\N
14334	1094	241	15	\N
14335	1094	3	16	\N
14337	1094	38	18	\N
14338	1094	12	19	\N
14339	1094	220	20	\N
14340	1094	349	21	\N
14341	1094	240	22	\N
14342	1095	12	1	\N
14343	1095	117	2	\N
14344	1095	118	3	\N
14345	1095	233	4	\N
14346	1095	285	5	\N
14347	1095	349	6	\N
14348	1095	24	7	\N
14349	1095	120	8	\N
14350	1095	226	9	\N
14351	1095	198	10	\N
14352	1095	185	11	\N
14353	1095	119	12	\N
14354	1095	220	13	\N
14355	1095	411	14	\N
14357	1095	413	16	\N
14358	1095	391	17	\N
14359	1095	327	18	\N
14361	1095	167	20	\N
14362	1095	241	21	\N
14363	1095	3	22	\N
14365	1095	38	24	\N
14366	1095	238	25	\N
14367	1095	376	26	\N
14368	1095	240	27	\N
14369	1096	304	1	\N
14370	1096	3	2	\N
14371	1096	115	3	\N
14372	1096	241	4	\N
14373	1096	119	5	\N
14374	1096	220	6	\N
14375	1096	12	7	\N
14377	1096	38	9	\N
14378	1096	349	10	\N
14379	1097	24	1	\N
14380	1097	115	2	\N
14381	1097	4	3	\N
14382	1097	202	4	\N
14383	1097	119	5	\N
14384	1097	220	6	\N
14385	1097	12	7	\N
14387	1097	38	9	\N
14388	1097	349	10	\N
14389	1097	234	11	\N
14390	1098	304	1	\N
14391	1098	117	2	\N
14392	1098	118	3	\N
14393	1098	3	4	\N
14394	1098	233	5	\N
14395	1098	169	6	\N
14396	1098	226	7	\N
14397	1098	349	8	\N
14398	1098	198	9	\N
14399	1098	212	10	\N
14400	1098	220	11	\N
14360	1095	177	19	\N
14271	969	5	6	\N
14401	1098	119	12	\N
14402	1098	231	13	\N
14403	1098	210	14	\N
14404	1098	241	15	\N
14405	1098	120	16	\N
14406	1098	12	17	\N
14408	1098	38	19	\N
14409	1098	285	20	\N
14410	1098	240	21	\N
14411	1099	115	1	\N
14412	1099	202	2	\N
14413	1099	118	3	\N
14414	1099	227	4	\N
14415	1099	231	5	\N
14416	1099	7	6	\N
14417	1099	117	7	\N
14418	1099	109	8	\N
14419	1099	198	9	\N
14420	1099	213	10	\N
14421	1099	111	11	\N
14422	1099	119	12	\N
14423	1099	101	13	\N
14424	1099	210	14	\N
14425	1099	4	15	\N
14426	1099	241	16	\N
14427	1099	3	17	\N
14428	1099	12	18	\N
14430	1099	38	20	\N
14431	1099	285	21	\N
14432	1099	220	22	\N
14433	1099	18	23	\N
14434	1100	304	1	\N
14435	1100	24	2	\N
14436	1100	115	3	\N
14437	1100	212	4	\N
14438	1100	118	5	\N
14439	1100	169	6	\N
14440	1100	7	7	\N
14441	1100	17	8	\N
14442	1100	226	9	\N
14443	1100	198	10	\N
14444	1100	173	11	\N
14446	1100	119	13	\N
14447	1100	171	14	\N
14448	1100	199	15	\N
14449	1100	117	16	\N
14450	1100	241	17	\N
14451	1100	3	18	\N
14452	1100	12	19	\N
14454	1100	38	21	\N
14455	1100	285	22	\N
14456	1100	220	23	\N
14457	1101	304	1	\N
14458	1101	3	2	\N
14459	1101	115	3	\N
14460	1101	241	4	\N
14461	1101	12	5	\N
14463	1101	38	7	\N
14464	1101	285	8	\N
14465	1101	231	9	\N
14466	1102	115	1	\N
14467	1102	3	2	\N
14468	1102	117	3	\N
14469	1102	212	4	\N
14470	1102	118	5	\N
14473	1102	241	8	\N
14474	1102	12	9	\N
14476	1102	38	11	\N
14477	1102	285	12	\N
14478	1103	242	1	\N
14479	1103	115	2	\N
14480	1103	195	3	\N
14481	1103	155	4	\N
14482	1103	118	5	\N
14483	1103	7	6	\N
14484	1103	99	7	\N
14485	1103	113	8	\N
14486	1103	174	9	\N
14487	1103	198	10	\N
14488	1103	173	11	\N
14489	1103	119	12	\N
14491	1103	199	14	\N
14492	1103	117	15	\N
14493	1103	241	16	\N
14494	1103	3	17	\N
14495	1103	12	18	\N
14497	1103	38	20	\N
14498	1103	285	21	\N
14499	1103	18	22	\N
14500	1104	115	1	\N
14501	1104	4	2	\N
14502	1104	212	3	\N
14503	1104	118	4	\N
14504	1104	169	5	\N
14505	1104	7	6	\N
14506	1104	117	7	\N
14507	1104	174	8	\N
14508	1104	198	9	\N
14509	1104	99	10	\N
14510	1104	231	11	\N
14511	1104	119	12	\N
14512	1104	171	13	\N
14514	1104	210	15	\N
14515	1104	241	16	\N
14516	1104	3	17	\N
14517	1104	12	18	\N
14519	1104	38	20	\N
14520	1104	285	21	\N
14521	1105	304	1	\N
14522	1105	241	2	\N
14523	1105	115	3	\N
14524	1105	202	4	\N
14525	1105	118	5	\N
14526	1105	169	6	\N
14527	1105	7	7	\N
14528	1105	113	8	\N
14529	1105	174	9	\N
14530	1105	198	10	\N
14531	1105	173	11	\N
14533	1105	119	13	\N
14534	1105	171	14	\N
14536	1105	199	16	\N
14537	1105	4	17	\N
14538	1105	3	18	\N
14539	1105	12	19	\N
14541	1105	38	21	\N
14542	1105	285	22	\N
14543	1105	231	23	\N
14544	1106	304	1	\N
14545	1106	117	2	\N
14546	1106	213	3	\N
14547	1106	212	4	\N
14548	1106	118	5	\N
14549	1106	169	6	\N
14550	1106	115	7	\N
14551	1106	174	8	\N
14552	1106	198	9	\N
14553	1106	170	10	\N
14554	1106	99	11	\N
14555	1106	119	12	\N
14557	1106	210	14	\N
14558	1106	241	15	\N
14559	1106	3	16	\N
14560	1106	12	17	\N
14562	1106	38	19	\N
14563	1106	285	20	\N
14564	1107	115	1	\N
14565	1107	4	2	\N
14566	1107	212	3	\N
14567	1107	118	4	\N
14568	1107	7	5	\N
14569	1107	99	6	\N
14570	1107	113	7	\N
14571	1107	174	8	\N
14572	1107	198	9	\N
14573	1107	173	10	\N
14574	1107	119	11	\N
14576	1107	167	13	\N
14577	1107	117	14	\N
14578	1107	241	15	\N
14579	1107	3	16	\N
14580	1107	12	17	\N
14582	1107	38	19	\N
14583	1107	285	20	\N
14584	1107	231	21	\N
14585	1108	304	1	\N
14407	1098	277	18	\N
14429	1099	277	19	\N
14453	1100	277	20	\N
14462	1101	277	6	\N
14475	1102	277	10	\N
14496	1103	277	19	\N
14445	1100	5	12	\N
14471	1102	5	6	\N
14532	1105	5	12	\N
14586	1108	24	2	\N
14587	1108	115	3	\N
14588	1108	212	4	\N
14589	1108	118	5	\N
14590	1108	169	6	\N
14591	1108	7	7	\N
14592	1108	17	8	\N
14593	1108	226	9	\N
14594	1108	198	10	\N
14595	1108	173	11	\N
14597	1108	119	13	\N
14598	1108	186	14	\N
14600	1108	210	16	\N
14601	1108	117	17	\N
14602	1108	241	18	\N
14603	1108	3	19	\N
14604	1108	12	20	\N
14606	1108	38	22	\N
14607	1108	285	23	\N
14608	1109	115	1	\N
14609	1109	4	2	\N
14610	1109	213	3	\N
14611	1109	118	4	\N
14612	1109	169	5	\N
14613	1109	7	6	\N
14614	1109	17	7	\N
14615	1109	226	8	\N
14616	1109	198	9	\N
14617	1109	173	10	\N
14619	1109	119	12	\N
14620	1109	186	13	\N
14621	1109	210	14	\N
14622	1109	117	15	\N
14623	1109	241	16	\N
14624	1109	3	17	\N
14625	1109	12	18	\N
14627	1109	38	20	\N
14628	1109	285	21	\N
14629	1109	231	22	\N
14630	1110	304	1	\N
14631	1110	24	2	\N
14632	1110	115	3	\N
14633	1110	212	4	\N
14634	1110	118	5	\N
14635	1110	169	6	\N
14636	1110	208	7	\N
14637	1110	117	8	\N
14638	1110	174	9	\N
14639	1110	198	10	\N
14640	1110	170	11	\N
14641	1110	99	12	\N
14642	1110	119	13	\N
14643	1110	171	14	\N
14645	1110	199	16	\N
14646	1110	241	17	\N
14647	1110	3	18	\N
14648	1110	12	19	\N
14650	1110	38	21	\N
14651	1110	220	22	\N
14652	1110	285	23	\N
14653	1111	304	1	\N
14654	1111	24	2	\N
14655	1111	115	3	\N
14656	1111	212	4	\N
14657	1111	118	5	\N
14658	1111	169	6	\N
14659	1111	7	7	\N
14660	1111	17	8	\N
14661	1111	226	9	\N
14662	1111	198	10	\N
14663	1111	173	11	\N
14665	1111	119	13	\N
14666	1111	171	14	\N
14668	1111	167	16	\N
14669	1111	117	17	\N
14670	1111	241	18	\N
14671	1111	3	19	\N
14672	1111	12	20	\N
14674	1111	38	22	\N
14675	1111	285	23	\N
14676	1111	18	24	\N
14677	1112	304	1	\N
14678	1112	115	2	\N
14679	1112	4	3	\N
14680	1112	213	4	\N
14681	1112	118	5	\N
14682	1112	169	6	\N
14683	1112	208	7	\N
14684	1112	117	8	\N
14685	1112	174	9	\N
14686	1112	198	10	\N
14687	1112	170	11	\N
14688	1112	99	12	\N
14689	1112	119	13	\N
14690	1112	186	14	\N
14691	1112	210	15	\N
14692	1112	241	16	\N
14693	1112	3	17	\N
14694	1112	12	18	\N
14696	1112	38	20	\N
14697	1112	220	21	\N
14698	1113	304	1	\N
14699	1113	115	2	\N
14700	1113	4	3	\N
14701	1113	213	4	\N
14702	1113	118	5	\N
14703	1113	169	6	\N
14704	1113	208	7	\N
14705	1113	117	8	\N
14706	1113	174	9	\N
14707	1113	198	10	\N
14708	1113	170	11	\N
14709	1113	99	12	\N
14710	1113	119	13	\N
14711	1113	171	14	\N
14712	1113	199	15	\N
14713	1113	241	16	\N
14714	1113	3	17	\N
14715	1113	12	18	\N
14717	1113	38	20	\N
14718	1113	285	21	\N
14719	1113	18	22	\N
14720	1114	304	1	\N
14721	1114	17	2	\N
14722	1114	115	3	\N
14723	1114	24	4	\N
14724	1114	118	5	\N
14725	1114	169	6	\N
14726	1114	7	7	\N
14727	1114	226	8	\N
14728	1114	198	9	\N
14729	1114	117	10	\N
14731	1114	119	12	\N
14732	1114	186	13	\N
14734	1114	210	15	\N
14735	1114	241	16	\N
14736	1114	3	17	\N
14737	1114	12	18	\N
14739	1114	38	20	\N
14740	1114	220	21	\N
14741	1115	304	1	\N
14742	1115	118	2	\N
14743	1115	17	3	\N
14744	1115	24	4	\N
14745	1115	115	5	\N
14746	1115	169	6	\N
14747	1115	117	7	\N
14748	1115	226	8	\N
14749	1115	198	9	\N
14750	1115	173	10	\N
14751	1115	208	11	\N
14752	1115	119	12	\N
14753	1115	186	13	\N
14755	1115	167	15	\N
14756	1115	241	16	\N
14758	1115	3	18	\N
14759	1115	12	19	\N
14761	1115	38	21	\N
14762	1115	220	22	\N
14763	1116	304	1	\N
14764	1116	117	2	\N
14765	1116	114	3	\N
14766	1116	118	4	\N
14767	1116	227	5	\N
14768	1116	7	6	\N
14769	1116	226	7	\N
14770	1116	198	8	\N
14605	1108	277	21	\N
14626	1109	277	19	\N
14649	1110	277	20	\N
14673	1111	277	21	\N
14695	1112	277	19	\N
14596	1108	5	12	\N
14618	1109	5	11	\N
14664	1111	5	12	\N
14730	1114	5	11	\N
14757	1115	5	17	\N
14771	1116	99	9	\N
14772	1116	119	10	\N
14773	1116	208	11	\N
14774	1116	171	12	\N
14776	1116	199	14	\N
14777	1116	17	15	\N
14778	1116	3	16	\N
14779	1116	4	17	\N
14780	1116	241	18	\N
14781	1116	12	19	\N
14783	1116	38	21	\N
14784	1116	220	22	\N
14785	1117	304	1	\N
14786	1117	212	2	\N
14787	1117	3	3	\N
14788	1117	213	4	\N
14789	1117	118	5	\N
14790	1117	148	6	\N
14791	1117	169	7	\N
14792	1117	115	8	\N
14793	1117	198	9	\N
14794	1117	113	10	\N
14796	1117	173	12	\N
14797	1117	231	13	\N
14798	1117	119	14	\N
14799	1117	186	15	\N
14800	1117	210	16	\N
14801	1117	241	17	\N
14802	1117	117	18	\N
14803	1117	116	19	\N
14804	1117	12	20	\N
14806	1117	38	22	\N
14807	1117	285	23	\N
14808	1118	304	1	\N
14809	1118	24	2	\N
14811	1118	213	4	\N
14812	1118	118	5	\N
14813	1118	231	6	\N
14814	1118	169	7	\N
14815	1118	198	8	\N
14816	1118	174	9	\N
14817	1118	117	10	\N
14818	1118	212	11	\N
14819	1118	208	12	\N
14820	1118	119	13	\N
14821	1118	186	14	\N
14822	1118	210	15	\N
14823	1118	109	16	\N
14824	1118	17	17	\N
14825	1118	3	18	\N
14826	1118	12	19	\N
14828	1118	38	21	\N
14829	1118	220	22	\N
14830	1119	304	1	\N
14831	1119	17	2	\N
14832	1119	3	3	\N
14833	1119	213	4	\N
14834	1119	118	5	\N
14835	1119	231	6	\N
14836	1119	169	7	\N
14837	1119	115	8	\N
14838	1119	198	9	\N
14839	1119	173	10	\N
14840	1119	151	11	\N
14841	1119	113	12	\N
14843	1119	119	14	\N
14844	1119	171	15	\N
14845	1119	167	16	\N
14846	1119	241	17	\N
14847	1119	117	18	\N
14848	1119	116	19	\N
14849	1119	12	20	\N
14851	1119	38	22	\N
14852	1119	285	23	\N
14853	1120	115	1	\N
14854	1120	213	2	\N
14855	1120	118	3	\N
14856	1120	119	4	\N
14857	1120	231	5	\N
14858	1120	198	6	\N
14859	1120	241	7	\N
14860	1120	113	8	\N
14862	1120	151	10	\N
14863	1120	171	11	\N
14864	1120	199	12	\N
14865	1120	109	13	\N
14866	1120	117	14	\N
14867	1120	195	15	\N
14868	1120	12	16	\N
14869	1120	3	17	\N
14871	1120	38	19	\N
14872	1120	220	20	\N
14873	1120	285	21	\N
14874	1121	304	1	\N
14875	1121	117	2	\N
14876	1121	114	3	\N
14877	1121	118	4	\N
14878	1121	227	5	\N
14879	1121	116	6	\N
14880	1121	241	7	\N
14881	1121	226	8	\N
14882	1121	99	9	\N
14883	1121	12	10	\N
14884	1121	186	11	\N
14885	1121	119	12	\N
14886	1121	167	13	\N
14887	1121	4	14	\N
14888	1121	212	15	\N
14889	1121	17	16	\N
14890	1121	3	17	\N
14892	1121	38	19	\N
14893	1121	285	20	\N
14894	1121	202	21	\N
14895	1122	304	1	\N
14896	1122	17	2	\N
14897	1122	3	3	\N
14898	1122	241	4	\N
14899	1122	12	5	\N
14900	1122	231	6	\N
14903	1122	38	9	\N
14904	1122	285	10	\N
14905	1123	304	1	\N
14906	1123	212	2	\N
14907	1123	3	3	\N
14908	1123	118	4	\N
14909	1123	231	5	\N
14910	1123	119	6	\N
14911	1123	202	7	\N
14912	1123	241	8	\N
14913	1123	117	9	\N
14914	1123	12	10	\N
14916	1123	38	12	\N
14917	1123	285	13	\N
14918	1123	117	14	\N
14919	1124	304	1	\N
14920	1124	17	2	\N
14921	1124	3	3	\N
14922	1124	226	4	\N
14923	1124	118	5	\N
14924	1124	119	6	\N
14925	1124	241	7	\N
14926	1124	117	8	\N
14927	1124	12	9	\N
14929	1124	38	11	\N
14930	1124	285	12	\N
14931	1124	18	13	\N
14932	1125	118	1	\N
14933	1125	3	2	\N
14934	1125	202	3	\N
14935	1125	117	4	\N
14936	1125	208	5	\N
14937	1125	115	6	\N
14938	1125	155	7	\N
14939	1125	213	8	\N
14940	1125	113	9	\N
14941	1125	285	10	\N
14942	1125	167	11	\N
14943	1125	241	12	\N
14945	1125	38	14	\N
14946	1125	12	15	\N
14947	1125	119	16	\N
14948	1125	231	17	\N
14949	1126	304	1	\N
14950	1126	241	2	\N
14951	1126	212	3	\N
14952	1126	117	4	\N
14953	1126	4	5	\N
14954	1126	17	6	\N
14955	1126	114	7	\N
14782	1116	277	20	\N
14805	1117	277	21	\N
14944	1125	277	13	\N
14795	1117	5	11	\N
14842	1119	5	13	\N
14861	1120	5	9	\N
14901	1122	5	7	\N
14956	1126	226	8	\N
14957	1126	173	9	\N
14958	1126	186	10	\N
14959	1126	285	11	\N
14960	1126	210	12	\N
14961	1126	12	13	\N
14963	1126	38	15	\N
14964	1126	3	16	\N
14965	1126	116	17	\N
14966	1126	220	18	\N
14967	1126	231	19	\N
14968	1127	241	1	\N
14969	1127	117	2	\N
14970	1127	12	3	\N
14972	1127	38	5	\N
14973	1127	220	6	\N
14974	1127	285	7	\N
14975	1128	241	1	\N
14977	1128	38	3	\N
14978	1128	12	4	\N
14979	1128	285	5	\N
14980	1128	231	6	\N
14981	1129	304	1	\N
14983	1129	17	3	\N
14984	1129	202	4	\N
14985	1129	241	5	\N
14986	1129	173	6	\N
14987	1129	117	7	\N
14988	1129	212	8	\N
14989	1129	213	9	\N
14990	1129	285	10	\N
14991	1129	171	11	\N
14992	1129	229	12	\N
14993	1129	116	13	\N
14994	1129	12	14	\N
14996	1129	38	16	\N
14997	1129	220	17	\N
14998	1129	231	18	\N
14999	1130	304	1	\N
15000	1130	241	2	\N
15001	1130	212	3	\N
15002	1130	117	4	\N
15003	1130	227	5	\N
15004	1130	231	6	\N
15005	1130	226	7	\N
15006	1130	213	8	\N
15007	1130	195	9	\N
15009	1130	4	11	\N
15010	1130	220	12	\N
15011	1130	210	13	\N
15012	1130	17	14	\N
15013	1130	3	15	\N
15014	1130	12	16	\N
15016	1130	38	18	\N
15017	1130	285	19	\N
15018	1131	304	1	\N
15019	1131	328	2	\N
15021	1131	109	4	\N
15022	1131	212	5	\N
15023	1131	227	6	\N
15024	1131	24	7	\N
15025	1131	226	8	\N
15026	1131	197	9	\N
15027	1131	213	10	\N
15028	1131	414	11	\N
15029	1131	220	12	\N
15030	1131	210	13	\N
15031	1131	241	14	\N
15032	1131	12	15	\N
15033	1131	115	16	\N
15035	1131	38	18	\N
15036	1131	285	19	\N
15037	1132	304	1	\N
15038	1132	111	2	\N
15039	1132	117	3	\N
15040	1132	114	4	\N
15043	1132	185	7	\N
15044	1132	212	8	\N
15045	1132	113	9	\N
15046	1132	214	10	\N
15047	1132	199	11	\N
15048	1132	116	12	\N
15049	1132	241	13	\N
15050	1132	12	14	\N
15051	1132	3	15	\N
15053	1132	38	17	\N
15054	1132	231	18	\N
15055	1133	304	1	\N
15056	1133	109	2	\N
15057	1133	241	3	\N
15058	1133	174	4	\N
15059	1133	212	5	\N
15060	1133	227	6	\N
15061	1133	7	7	\N
15062	1133	195	8	\N
15063	1133	104	9	\N
15064	1133	159	10	\N
15065	1133	213	11	\N
15066	1133	231	12	\N
15068	1133	415	14	\N
15069	1133	168	15	\N
15070	1133	210	16	\N
15071	1133	115	17	\N
15072	1133	117	18	\N
15073	1133	3	19	\N
15074	1133	12	20	\N
15076	1133	38	22	\N
15077	1133	116	23	\N
15078	1133	285	24	\N
15079	1133	18	25	\N
15080	1134	318	1	\N
15081	1134	116	2	\N
15083	1134	38	4	\N
15084	1134	17	5	\N
15085	1134	3	6	\N
15086	1134	190	7	\N
15087	1134	101	8	\N
15088	1134	170	9	\N
15089	1134	99	10	\N
15090	1134	100	11	\N
15091	1134	159	12	\N
15093	1134	169	14	\N
15094	1134	186	15	\N
15095	1134	416	16	\N
15096	1134	220	17	\N
15097	1134	231	18	\N
15098	1134	167	19	\N
15099	1134	155	20	\N
15100	1134	117	21	\N
15101	1134	241	22	\N
15102	1134	12	23	\N
15103	1134	4	24	\N
15104	1134	285	25	\N
15105	1135	304	1	\N
15106	1135	3	2	\N
15107	1135	99	3	\N
15108	1135	160	4	\N
15109	1135	104	5	\N
15111	1135	101	7	\N
15112	1135	170	8	\N
15113	1135	306	9	\N
15114	1135	152	10	\N
15115	1135	154	11	\N
15116	1135	169	12	\N
15117	1135	340	13	\N
15118	1135	7	14	\N
15119	1135	186	15	\N
15120	1135	417	16	\N
15121	1135	220	17	\N
15122	1135	151	18	\N
15123	1135	210	19	\N
15124	1135	190	20	\N
15125	1135	117	21	\N
15126	1135	241	22	\N
15127	1135	12	23	\N
15129	1135	38	25	\N
15130	1135	285	26	\N
15131	1135	108	27	\N
15132	1135	231	28	\N
15133	1136	304	1	\N
15134	1136	3	2	\N
15135	1136	117	3	\N
15136	1136	174	4	\N
15138	1136	227	6	\N
15139	1136	231	7	\N
15140	1136	17	8	\N
15041	1132	207	5	\N
14982	1129	177	2	\N
15110	1135	360	6	\N
15008	1130	5	10	\N
15042	1132	5	6	\N
15092	1134	5	13	\N
15137	1136	5	5	\N
15141	1136	226	9	\N
15142	1136	195	10	\N
15143	1136	113	11	\N
15144	1136	213	12	\N
15145	1136	169	13	\N
15146	1136	186	14	\N
15147	1136	220	15	\N
15148	1136	210	16	\N
15149	1136	241	17	\N
15150	1136	212	18	\N
15151	1136	12	19	\N
15152	1136	115	20	\N
15154	1136	38	22	\N
15155	1136	168	23	\N
15156	1136	285	24	\N
15157	1136	18	25	\N
15158	1137	318	1	\N
15159	1137	95	2	\N
15160	1137	94	3	\N
15161	1137	160	4	\N
15162	1137	104	5	\N
15164	1137	170	7	\N
15165	1137	135	8	\N
15166	1137	306	9	\N
15167	1137	187	10	\N
15168	1137	169	11	\N
15169	1137	340	12	\N
15170	1137	7	13	\N
15171	1137	112	14	\N
15172	1137	418	15	\N
15173	1137	220	16	\N
15174	1137	151	17	\N
15175	1137	167	18	\N
15176	1137	154	19	\N
15177	1137	190	20	\N
15178	1137	117	21	\N
15179	1137	241	22	\N
15180	1137	3	23	\N
15182	1137	38	25	\N
15183	1137	285	26	\N
15184	1138	318	1	\N
15185	1138	138	2	\N
15186	1138	94	3	\N
15187	1138	160	4	\N
15188	1138	153	5	\N
15189	1138	149	6	\N
15190	1138	104	7	\N
15191	1138	170	8	\N
15192	1138	222	9	\N
15193	1138	152	10	\N
15194	1138	306	11	\N
15195	1138	148	12	\N
15196	1138	97	13	\N
15197	1138	7	14	\N
15198	1138	186	15	\N
15199	1138	171	16	\N
15200	1138	190	17	\N
15201	1138	167	18	\N
15202	1138	117	19	\N
15203	1138	241	20	\N
15204	1138	17	21	\N
15205	1138	419	22	\N
15206	1138	168	23	\N
15207	1138	285	24	\N
15208	1139	318	1	\N
15209	1139	95	2	\N
15210	1139	94	3	\N
15211	1139	160	4	\N
15232	1140	318	1	\N
15233	1140	138	2	\N
15234	1140	94	3	\N
15235	1140	99	4	\N
15236	1140	153	5	\N
15237	1140	149	6	\N
15238	1140	151	7	\N
15239	1140	222	8	\N
15240	1140	306	9	\N
15241	1140	205	10	\N
15242	1140	148	11	\N
15243	1140	340	12	\N
15244	1140	7	13	\N
15245	1140	186	14	\N
15246	1140	171	15	\N
15247	1140	167	16	\N
15248	1140	170	17	\N
15249	1140	187	18	\N
15250	1140	190	19	\N
15251	1140	117	20	\N
15252	1140	241	21	\N
15253	1140	3	22	\N
15254	1140	285	23	\N
15255	1141	318	1	\N
15256	1141	95	2	\N
15257	1141	94	3	\N
15258	1141	160	4	\N
15280	1142	318	1	\N
15281	1142	138	2	\N
15282	1142	94	3	\N
15283	1142	99	4	\N
15284	1142	153	5	\N
15285	1142	149	6	\N
15286	1142	151	7	\N
15287	1142	222	8	\N
15288	1142	152	9	\N
15289	1142	172	10	\N
15290	1142	169	11	\N
15291	1142	340	12	\N
15292	1142	7	13	\N
15293	1142	186	14	\N
15294	1142	171	15	\N
15295	1142	167	16	\N
15296	1142	170	17	\N
15297	1142	187	18	\N
15298	1142	190	19	\N
15299	1142	117	20	\N
15300	1142	241	21	\N
15301	1142	3	22	\N
15302	1142	285	23	\N
15303	1143	318	1	\N
15304	1143	95	2	\N
15305	1143	94	3	\N
15306	1143	160	4	\N
15163	1137	360	6	\N
15214	1139	173	7	\N
15215	1139	208	8	\N
15216	1139	139	9	\N
15217	1139	152	10	\N
15219	1139	169	12	\N
15220	1139	97	13	\N
15221	1139	7	14	\N
15222	1139	112	15	\N
15326	1144	318	1	\N
15327	1144	138	2	\N
15328	1144	94	3	\N
15329	1144	99	4	\N
15330	1144	153	5	\N
15331	1144	149	6	\N
15332	1144	151	7	\N
15333	1144	222	8	\N
15334	1144	152	9	\N
15335	1144	172	10	\N
15336	1144	169	11	\N
15337	1144	340	12	\N
15338	1144	7	13	\N
15339	1144	186	14	\N
15340	1144	171	15	\N
15341	1144	167	16	\N
15342	1144	170	17	\N
15343	1144	187	18	\N
15344	1144	190	19	\N
15345	1144	117	20	\N
15346	1144	241	21	\N
15347	1144	3	22	\N
15348	1145	318	1	\N
15349	1145	138	2	\N
15350	1145	94	3	\N
15351	1145	160	4	\N
15373	1146	318	1	\N
15374	1146	95	2	\N
15375	1146	328	3	\N
15376	1146	99	4	\N
15377	1146	153	5	\N
15378	1146	149	6	\N
15379	1146	151	7	\N
15380	1146	222	8	\N
15381	1146	152	9	\N
15382	1146	172	10	\N
15383	1146	148	11	\N
15384	1146	340	12	\N
15385	1146	7	13	\N
15386	1146	186	14	\N
15387	1146	171	15	\N
15388	1146	167	16	\N
15389	1146	170	17	\N
15390	1146	187	18	\N
15391	1146	190	19	\N
15392	1146	117	20	\N
15393	1146	241	21	\N
15394	1146	3	22	\N
15395	1147	304	1	\N
15396	1147	109	2	\N
15397	1147	99	3	\N
15398	1147	153	4	\N
15399	1147	241	5	\N
15400	1147	151	6	\N
15401	1147	222	7	\N
15402	1147	152	8	\N
15403	1147	115	9	\N
15404	1147	212	10	\N
15405	1147	186	11	\N
15406	1147	231	12	\N
15407	1147	12	13	\N
15408	1147	210	14	\N
15409	1147	117	15	\N
15410	1147	170	16	\N
15411	1147	3	17	\N
15413	1147	38	19	\N
15414	1147	285	20	\N
15415	1148	318	1	\N
15416	1148	139	2	\N
15417	1148	328	3	\N
15418	1148	95	4	\N
15419	1148	99	5	\N
15420	1148	153	6	\N
15421	1148	149	7	\N
15422	1148	151	8	\N
15423	1148	222	9	\N
15424	1148	152	10	\N
15425	1148	172	11	\N
15426	1148	148	12	\N
15427	1148	340	13	\N
15428	1148	7	14	\N
15429	1148	186	15	\N
15430	1148	171	16	\N
15431	1148	167	17	\N
15432	1148	170	18	\N
15433	1148	187	19	\N
15434	1148	190	20	\N
15435	1148	117	21	\N
15436	1148	241	22	\N
15437	1148	285	23	\N
15438	1149	318	1	\N
15439	1149	95	2	\N
15440	1149	328	3	\N
15441	1149	99	4	\N
15442	1149	153	5	\N
15443	1149	149	6	\N
15444	1149	173	7	\N
15445	1149	222	8	\N
15446	1149	152	9	\N
15447	1149	172	10	\N
15448	1149	148	11	\N
15449	1149	340	12	\N
15450	1149	7	13	\N
15451	1149	186	14	\N
15453	1149	167	16	\N
15454	1149	170	17	\N
15455	1149	187	18	\N
15456	1149	151	19	\N
15457	1149	160	20	\N
15458	1149	190	21	\N
15459	1149	101	22	\N
15461	1149	38	24	\N
15462	1150	304	1	\N
15463	1150	241	2	\N
15464	1150	3	3	\N
15465	1150	117	4	\N
15466	1150	227	5	\N
15467	1150	12	6	\N
15469	1150	38	8	\N
15470	1150	285	9	\N
15471	1151	304	1	\N
15472	1151	241	2	\N
15473	1151	3	3	\N
15474	1151	174	4	\N
15475	1151	227	5	\N
15476	1151	231	6	\N
15477	1151	195	7	\N
15478	1151	117	8	\N
15479	1151	320	9	\N
15480	1151	113	10	\N
15482	1151	12	12	\N
15483	1151	199	13	\N
15484	1151	4	14	\N
15485	1151	213	15	\N
15487	1151	38	17	\N
15488	1151	116	18	\N
15489	1151	220	19	\N
15490	1151	285	20	\N
15491	1152	304	1	\N
15492	1152	241	2	\N
15493	1152	3	3	\N
15494	1152	174	4	\N
15495	1152	227	5	\N
15496	1152	231	6	\N
15497	1152	17	7	\N
15498	1152	226	8	\N
15499	1152	117	9	\N
15500	1152	212	10	\N
15501	1152	12	11	\N
15502	1152	285	12	\N
15503	1152	210	13	\N
15504	1152	4	14	\N
15505	1152	213	15	\N
15507	1152	38	17	\N
15508	1152	116	18	\N
15509	1152	220	19	\N
15510	1153	304	1	\N
15354	1145	173	7	\N
15355	1145	139	8	\N
15356	1145	152	9	\N
15358	1145	169	11	\N
15359	1145	97	12	\N
15360	1145	7	13	\N
15361	1145	112	14	\N
15511	1153	241	2	\N
15512	1153	3	3	\N
15513	1153	174	4	\N
15514	1153	227	5	\N
15515	1153	231	6	\N
15516	1153	17	7	\N
15517	1153	226	8	\N
15518	1153	117	9	\N
15519	1153	212	10	\N
15520	1153	12	11	\N
15521	1153	285	12	\N
15522	1153	210	13	\N
15523	1153	4	14	\N
15524	1153	213	15	\N
15526	1153	38	17	\N
15527	1153	116	18	\N
15528	1153	220	19	\N
15529	1154	304	1	\N
15530	1154	241	2	\N
15531	1154	3	3	\N
15532	1154	174	4	\N
15533	1154	227	5	\N
15534	1154	231	6	\N
15535	1154	17	7	\N
15536	1154	226	8	\N
15537	1154	117	9	\N
15538	1154	113	10	\N
15539	1154	12	11	\N
15540	1154	285	12	\N
15541	1154	210	13	\N
15542	1154	4	14	\N
15543	1154	213	15	\N
15545	1154	38	17	\N
15546	1154	116	18	\N
15547	1154	220	19	\N
15548	1155	304	1	\N
15549	1155	241	2	\N
15550	1155	3	3	\N
15551	1155	174	4	\N
15552	1155	227	5	\N
15553	1155	231	6	\N
15554	1155	17	7	\N
15555	1155	226	8	\N
15556	1155	117	9	\N
15557	1155	113	10	\N
15558	1155	12	11	\N
15559	1155	199	12	\N
15560	1155	4	13	\N
15561	1155	213	14	\N
15563	1155	38	16	\N
15564	1155	116	17	\N
15565	1155	220	18	\N
15566	1155	285	19	\N
15567	1156	304	1	\N
15568	1156	241	2	\N
15569	1156	3	3	\N
15570	1156	174	4	\N
15571	1156	227	5	\N
15572	1156	231	6	\N
15573	1156	24	7	\N
15574	1156	117	8	\N
15575	1156	115	9	\N
15576	1156	113	10	\N
15577	1156	12	11	\N
15578	1156	285	12	\N
15579	1156	199	13	\N
15580	1156	213	14	\N
15581	1156	111	15	\N
15583	1156	38	17	\N
15584	1156	116	18	\N
15585	1156	220	19	\N
15586	1157	304	1	\N
15587	1157	117	2	\N
15588	1157	17	3	\N
15589	1157	226	4	\N
15590	1157	227	5	\N
15592	1157	195	7	\N
15593	1157	185	8	\N
15594	1157	202	9	\N
15595	1157	213	10	\N
15596	1157	12	11	\N
15597	1157	210	12	\N
15598	1157	4	13	\N
15599	1157	241	14	\N
15601	1157	38	16	\N
15602	1157	116	17	\N
15603	1157	220	18	\N
15604	1158	304	1	\N
15605	1158	117	2	\N
15606	1158	17	3	\N
15607	1158	226	4	\N
15608	1158	201	5	\N
15610	1158	285	7	\N
15611	1158	185	8	\N
15612	1158	114	9	\N
15613	1158	202	10	\N
15614	1158	213	11	\N
15615	1158	12	12	\N
15616	1158	210	13	\N
15617	1158	4	14	\N
15618	1158	241	15	\N
15620	1158	38	17	\N
15621	1158	116	18	\N
15622	1158	220	19	\N
15623	1159	304	1	\N
15624	1159	241	2	\N
15625	1159	3	3	\N
15626	1159	174	4	\N
15627	1159	227	5	\N
15628	1159	231	6	\N
15629	1159	24	7	\N
15630	1159	117	8	\N
15631	1159	320	9	\N
15632	1159	113	10	\N
15633	1159	12	11	\N
15634	1159	285	12	\N
15635	1159	199	13	\N
15636	1159	213	14	\N
15637	1159	111	15	\N
15639	1159	38	17	\N
15640	1159	116	18	\N
15641	1159	220	19	\N
15642	1160	115	1	\N
15643	1160	3	2	\N
15644	1160	174	3	\N
15645	1160	227	4	\N
15646	1160	116	5	\N
15647	1160	195	6	\N
15648	1160	117	7	\N
15649	1160	320	8	\N
15650	1160	113	9	\N
15651	1160	12	10	\N
15652	1160	285	11	\N
15653	1160	199	12	\N
15654	1160	241	13	\N
15655	1160	213	14	\N
15657	1160	38	16	\N
15658	1160	231	17	\N
15659	1160	220	18	\N
15660	1161	111	1	\N
15661	1161	4	2	\N
15662	1161	115	3	\N
15663	1161	227	4	\N
15664	1161	285	5	\N
15665	1161	117	6	\N
15666	1161	24	7	\N
15667	1161	226	8	\N
15668	1161	198	9	\N
15669	1161	231	10	\N
15670	1161	210	11	\N
15671	1161	241	12	\N
15672	1161	213	13	\N
15674	1161	38	15	\N
15675	1161	3	16	\N
15676	1161	12	17	\N
15677	1161	220	18	\N
15678	1162	213	1	\N
15679	1162	114	2	\N
15680	1162	174	3	\N
15681	1162	227	4	\N
15682	1162	285	5	\N
15683	1162	163	6	\N
15684	1162	226	7	\N
15685	1162	212	8	\N
15686	1162	3	9	\N
15687	1162	231	10	\N
15688	1162	199	11	\N
15689	1162	241	12	\N
15690	1162	116	13	\N
15691	1162	320	14	\N
15693	1162	38	16	\N
15694	1162	117	17	\N
15695	1162	12	18	\N
15525	1153	277	16	\N
15544	1154	277	16	\N
15696	1162	220	19	\N
15697	1163	304	1	\N
15698	1163	241	2	\N
15699	1163	3	3	\N
15700	1163	117	4	\N
15701	1163	231	5	\N
15704	1163	38	8	\N
15705	1163	12	9	\N
15706	1163	220	10	\N
15707	1164	3	1	\N
15708	1164	212	2	\N
15709	1164	117	3	\N
15710	1164	227	4	\N
15711	1164	241	5	\N
15713	1164	38	7	\N
15714	1164	12	8	\N
15715	1164	285	9	\N
15716	1165	304	1	\N
15717	1165	241	2	\N
15718	1165	174	3	\N
15719	1165	3	4	\N
15720	1165	226	5	\N
15721	1165	214	6	\N
15723	1165	117	8	\N
15724	1165	202	9	\N
15725	1165	17	10	\N
15726	1165	213	11	\N
15727	1165	231	12	\N
15728	1165	12	13	\N
15729	1165	199	14	\N
15730	1165	185	15	\N
15731	1165	212	16	\N
15732	1165	4	17	\N
15733	1165	116	18	\N
15735	1165	38	20	\N
15736	1165	285	21	\N
15737	1165	220	22	\N
15738	1165	18	23	\N
15739	1166	304	1	\N
15740	1166	17	2	\N
15741	1166	195	3	\N
15742	1166	3	4	\N
15743	1166	226	5	\N
15744	1166	227	6	\N
15746	1166	117	8	\N
15747	1166	198	9	\N
15748	1166	103	10	\N
15749	1166	213	11	\N
15751	1166	231	13	\N
15752	1166	12	14	\N
15753	1166	210	15	\N
15754	1166	241	16	\N
15755	1166	212	17	\N
15757	1166	38	19	\N
15758	1166	116	20	\N
15759	1166	285	21	\N
15760	1166	220	22	\N
15761	1167	304	1	\N
15762	1167	3	2	\N
15763	1167	195	3	\N
15764	1167	226	4	\N
15765	1167	227	5	\N
15767	1167	117	7	\N
15768	1167	198	8	\N
15769	1167	228	9	\N
15770	1167	103	10	\N
15771	1167	231	11	\N
15773	1167	12	13	\N
15774	1167	210	14	\N
15775	1167	213	15	\N
15776	1167	241	16	\N
15777	1167	212	17	\N
15779	1167	38	19	\N
15780	1167	116	20	\N
15781	1167	285	21	\N
15782	1167	220	22	\N
15783	1168	304	1	\N
15784	1168	17	2	\N
15785	1168	138	3	\N
15786	1168	3	4	\N
15787	1168	109	5	\N
15788	1168	227	6	\N
15789	1168	113	7	\N
15790	1168	117	8	\N
15791	1168	185	9	\N
15792	1168	104	10	\N
15793	1168	7	11	\N
15794	1168	159	12	\N
15795	1168	4	13	\N
15796	1168	231	14	\N
15797	1168	12	15	\N
15798	1168	210	16	\N
15799	1168	213	17	\N
15800	1168	241	18	\N
15802	1168	38	20	\N
15803	1168	116	21	\N
15804	1168	285	22	\N
15805	1168	220	23	\N
15806	1169	304	1	\N
15807	1169	4	2	\N
15808	1169	139	3	\N
15809	1169	3	4	\N
15810	1169	109	5	\N
15811	1169	227	6	\N
15812	1169	113	7	\N
15813	1169	117	8	\N
15814	1169	174	9	\N
15815	1169	104	10	\N
15816	1169	100	11	\N
15817	1169	159	12	\N
15818	1169	155	13	\N
15819	1169	231	14	\N
15820	1169	12	15	\N
15821	1169	210	16	\N
15822	1169	213	17	\N
15823	1169	241	18	\N
15825	1169	38	20	\N
15826	1169	116	21	\N
15827	1169	285	22	\N
15828	1169	220	23	\N
15829	1170	304	1	\N
15830	1170	241	2	\N
15831	1170	195	3	\N
15832	1170	226	4	\N
15833	1170	227	5	\N
15835	1170	117	7	\N
15836	1170	202	8	\N
15837	1170	17	9	\N
15838	1170	103	10	\N
15839	1170	213	11	\N
15841	1170	231	13	\N
15842	1170	12	14	\N
15843	1170	210	15	\N
15844	1170	3	16	\N
15845	1170	212	17	\N
15846	1170	116	18	\N
15847	1170	285	19	\N
15848	1170	220	20	\N
15850	1170	38	22	\N
15851	1170	18	23	\N
15852	1171	304	1	\N
15853	1171	241	2	\N
15854	1171	195	3	\N
15855	1171	226	4	\N
15856	1171	227	5	\N
15858	1171	117	7	\N
15859	1171	24	8	\N
15860	1171	155	9	\N
15861	1171	103	10	\N
15862	1171	213	11	\N
15864	1171	285	13	\N
15865	1171	12	14	\N
15866	1171	210	15	\N
15867	1171	3	16	\N
15868	1171	212	17	\N
15869	1171	231	18	\N
15870	1171	116	19	\N
15872	1171	38	21	\N
15873	1171	220	22	\N
15874	1172	304	1	\N
15875	1172	241	2	\N
15876	1172	195	3	\N
15877	1172	226	4	\N
15878	1172	227	5	\N
15880	1172	117	7	\N
15703	1163	277	7	\N
15712	1164	277	6	\N
15734	1165	277	19	\N
15756	1166	277	18	\N
15702	1163	5	6	\N
15722	1165	5	7	\N
15745	1166	5	7	\N
15766	1167	5	6	\N
15834	1170	5	6	\N
15857	1171	5	6	\N
15879	1172	5	6	\N
15881	1172	198	8	\N
15882	1172	228	9	\N
15883	1172	103	10	\N
15884	1172	213	11	\N
15886	1172	210	13	\N
15887	1172	3	14	\N
15888	1172	212	15	\N
15889	1172	12	16	\N
15890	1172	231	17	\N
15891	1172	116	18	\N
15893	1172	38	20	\N
15894	1172	285	21	\N
15895	1172	220	22	\N
15896	1173	304	1	\N
15897	1173	241	2	\N
15898	1173	195	3	\N
15899	1173	202	4	\N
15900	1173	227	5	\N
15902	1173	198	7	\N
15903	1173	228	8	\N
15904	1173	103	9	\N
15905	1173	213	10	\N
15907	1173	210	12	\N
15908	1173	3	13	\N
15909	1173	212	14	\N
15910	1173	115	15	\N
15911	1173	231	16	\N
15912	1173	116	17	\N
15914	1173	38	19	\N
15915	1173	285	20	\N
15916	1173	220	21	\N
15917	1174	304	1	\N
15918	1174	241	2	\N
15919	1174	195	3	\N
15920	1174	226	4	\N
15921	1174	227	5	\N
15923	1174	198	7	\N
15924	1174	228	8	\N
15925	1174	103	9	\N
15926	1174	213	10	\N
15928	1174	210	12	\N
15929	1174	3	13	\N
15930	1174	212	14	\N
15931	1174	115	15	\N
15932	1174	231	16	\N
15933	1174	116	17	\N
15935	1174	38	19	\N
15936	1174	285	20	\N
15937	1174	220	21	\N
15938	1175	304	1	\N
15939	1175	241	2	\N
15940	1175	195	3	\N
15941	1175	226	4	\N
15942	1175	227	5	\N
15944	1175	198	7	\N
15945	1175	228	8	\N
15946	1175	103	9	\N
15947	1175	213	10	\N
15949	1175	210	12	\N
15950	1175	3	13	\N
15951	1175	212	14	\N
15952	1175	115	15	\N
15953	1175	231	16	\N
15954	1175	116	17	\N
15956	1175	38	19	\N
15957	1175	285	20	\N
15958	1175	220	21	\N
15959	1176	304	1	\N
15960	1176	241	2	\N
15961	1176	195	3	\N
15962	1176	226	4	\N
15963	1176	227	5	\N
15965	1176	198	7	\N
15966	1176	103	8	\N
15967	1176	213	9	\N
15969	1176	210	11	\N
15970	1176	3	12	\N
15971	1176	212	13	\N
15972	1176	115	14	\N
15973	1176	231	15	\N
15974	1176	116	16	\N
15976	1176	38	18	\N
15977	1176	285	19	\N
15978	1176	220	20	\N
15979	1177	304	1	\N
15980	1177	241	2	\N
15981	1177	202	3	\N
15982	1177	226	4	\N
15983	1177	227	5	\N
15985	1177	198	7	\N
15986	1177	228	8	\N
15988	1177	4	10	\N
15989	1177	285	11	\N
15990	1177	3	12	\N
15991	1177	212	13	\N
15992	1177	115	14	\N
15993	1177	231	15	\N
15994	1177	213	16	\N
15995	1177	116	17	\N
15997	1177	38	19	\N
15998	1177	220	20	\N
15999	1178	304	1	\N
16000	1178	241	2	\N
16001	1178	202	3	\N
16002	1178	226	4	\N
16003	1178	227	5	\N
16005	1178	198	7	\N
16006	1178	228	8	\N
16008	1178	285	10	\N
16009	1178	3	11	\N
16010	1178	212	12	\N
16011	1178	115	13	\N
16012	1178	214	14	\N
16013	1178	213	15	\N
16014	1178	116	16	\N
16016	1178	38	18	\N
16017	1178	231	19	\N
16018	1178	220	20	\N
16019	1179	304	1	\N
16020	1179	241	2	\N
16021	1179	202	3	\N
16022	1179	226	4	\N
16023	1179	227	5	\N
16024	1179	228	6	\N
16025	1179	198	7	\N
16028	1179	213	10	\N
16029	1179	285	11	\N
16030	1179	24	12	\N
16031	1179	231	13	\N
16032	1179	3	14	\N
16033	1179	116	15	\N
16034	1179	4	16	\N
16035	1179	212	17	\N
16037	1179	38	19	\N
16038	1179	220	20	\N
16039	1180	304	1	\N
16040	1180	113	2	\N
16041	1180	114	3	\N
16042	1180	241	4	\N
16043	1180	227	5	\N
16044	1180	226	6	\N
16045	1180	228	7	\N
16046	1180	198	8	\N
16047	1180	17	9	\N
16049	1180	116	11	\N
16050	1180	115	12	\N
16051	1180	213	13	\N
16052	1180	220	14	\N
16053	1180	285	15	\N
16054	1180	212	16	\N
16056	1180	38	18	\N
16057	1180	3	19	\N
16058	1180	231	20	\N
16059	1181	304	1	\N
16060	1181	3	2	\N
16061	1181	212	3	\N
16124	1187	114	4	\N
16125	1187	227	5	\N
16126	1187	98	6	\N
16127	1187	306	7	\N
15892	1172	277	19	\N
15913	1173	277	18	\N
15934	1174	277	18	\N
15955	1175	277	18	\N
15975	1176	277	17	\N
15996	1177	277	18	\N
16015	1178	277	17	\N
16036	1179	277	18	\N
15901	1173	5	6	\N
15922	1174	5	6	\N
15943	1175	5	6	\N
15964	1176	5	6	\N
15984	1177	5	6	\N
16004	1178	5	6	\N
16026	1179	5	8	\N
16129	1187	198	9	\N
16130	1187	213	10	\N
16133	1187	220	13	\N
16134	1187	210	14	\N
16136	1187	38	16	\N
16137	1187	3	17	\N
16138	1187	4	18	\N
16139	1187	285	19	\N
16140	1188	304	1	\N
16141	1188	135	2	\N
16142	1188	94	3	\N
16143	1188	226	4	\N
16144	1188	227	5	\N
16145	1188	231	6	\N
16147	1188	198	8	\N
16148	1188	103	9	\N
16149	1188	159	10	\N
16150	1188	168	11	\N
16151	1188	283	12	\N
16152	1188	210	13	\N
16153	1188	212	14	\N
16154	1188	3	15	\N
16156	1188	38	17	\N
16157	1188	285	18	\N
16158	1188	220	19	\N
16159	1189	304	1	\N
16160	1189	111	2	\N
16161	1189	94	3	\N
16162	1189	226	4	\N
16163	1189	227	5	\N
16164	1189	231	6	\N
16165	1189	114	7	\N
16167	1189	198	9	\N
16168	1189	103	10	\N
16169	1189	159	11	\N
16170	1189	168	12	\N
16171	1189	285	13	\N
16172	1189	210	14	\N
16173	1189	113	15	\N
16174	1189	212	16	\N
16175	1189	3	17	\N
16177	1189	38	19	\N
16178	1189	220	20	\N
16179	1190	304	1	\N
16180	1190	3	2	\N
16181	1190	212	3	\N
16182	1190	17	4	\N
16183	1190	115	5	\N
16184	1190	226	6	\N
16186	1190	38	8	\N
16187	1190	220	9	\N
16188	1191	17	1	\N
16189	1191	202	2	\N
16190	1191	114	3	\N
16191	1191	227	4	\N
16193	1191	24	6	\N
16194	1191	113	7	\N
16195	1191	226	8	\N
16197	1191	195	10	\N
16198	1191	214	11	\N
16199	1191	213	12	\N
16200	1191	220	13	\N
16201	1191	210	14	\N
16202	1191	115	15	\N
16203	1191	212	16	\N
16205	1191	38	18	\N
16206	1191	4	19	\N
16207	1191	3	20	\N
16208	1191	285	21	\N
16209	1191	18	22	\N
16211	1192	38	2	\N
16212	1192	202	3	\N
16213	1192	114	4	\N
16214	1192	227	5	\N
16216	1192	155	7	\N
16217	1192	113	8	\N
16218	1192	226	9	\N
16219	1192	109	10	\N
16220	1192	171	11	\N
16221	1192	104	12	\N
16222	1192	213	13	\N
16223	1192	220	14	\N
16224	1192	210	15	\N
16225	1192	159	16	\N
16226	1192	212	17	\N
16227	1192	17	18	\N
16228	1192	4	19	\N
16229	1192	3	20	\N
16230	1192	285	21	\N
16231	1193	285	1	\N
16232	1193	38	2	\N
16233	1193	17	3	\N
16234	1193	227	4	\N
16235	1193	231	5	\N
16236	1193	115	6	\N
16237	1193	24	7	\N
16238	1193	226	8	\N
16239	1193	228	9	\N
16241	1193	142	11	\N
16242	1193	213	12	\N
16243	1193	210	13	\N
16244	1193	159	14	\N
16245	1193	212	15	\N
16247	1193	4	17	\N
16248	1193	3	18	\N
16249	1193	220	19	\N
16250	782	264	1	\N
16251	782	45	2	\N
16252	782	155	3	\N
16253	782	13	4	\N
16254	782	38	5	\N
16255	782	107	6	\N
16256	782	201	7	\N
16257	782	138	8	\N
16258	782	257	9	\N
16259	782	263	10	\N
16260	782	116	11	\N
16261	782	4	12	\N
16262	782	119	13	\N
16263	782	285	14	\N
16264	782	101	15	\N
16265	782	265	16	\N
16266	782	210	17	\N
16267	782	260	18	\N
16268	782	239	19	\N
16269	782	152	20	\N
16270	782	126	21	\N
16271	782	14	22	\N
16272	782	271	23	\N
16273	781	264	1	\N
16274	781	17	2	\N
16275	781	4	3	\N
16276	781	3	4	\N
16277	781	38	5	\N
16278	781	16	6	\N
16279	781	231	7	\N
16280	781	45	8	\N
16281	781	46	9	\N
16282	781	47	10	\N
16283	781	227	11	\N
16284	781	118	12	\N
16286	781	217	14	\N
16287	781	112	15	\N
16288	781	265	16	\N
16289	781	210	17	\N
16290	781	260	18	\N
16291	781	212	19	\N
16292	781	12	20	\N
16293	781	13	21	\N
16294	781	14	22	\N
16295	781	271	23	\N
16296	779	264	1	\N
16297	779	13	2	\N
16298	779	122	3	\N
16299	779	126	4	\N
16300	779	239	5	\N
16301	779	38	6	\N
16302	779	104	7	\N
16303	779	124	8	\N
16304	779	135	9	\N
16305	779	263	10	\N
16306	779	116	11	\N
16307	779	47	12	\N
16309	779	127	14	\N
16310	779	217	15	\N
16311	779	265	16	\N
16312	779	402	17	\N
16313	779	260	18	\N
16196	1191	207	9	\N
16135	1187	277	15	\N
16155	1188	277	16	\N
16176	1189	277	18	\N
16185	1190	277	7	\N
16132	1187	5	12	\N
16192	1191	5	5	\N
16215	1192	5	6	\N
16246	1193	5	16	\N
16285	781	145	13	\N
16308	779	145	13	\N
16314	779	117	19	\N
16315	779	120	20	\N
16316	779	160	21	\N
16317	779	14	22	\N
16318	779	271	23	\N
16319	780	264	1	\N
16320	780	24	2	\N
16321	780	100	3	\N
16322	780	3	4	\N
16323	780	248	5	\N
16324	780	38	6	\N
16325	780	7	7	\N
16326	780	231	8	\N
16327	780	45	9	\N
16328	780	107	10	\N
16329	780	125	11	\N
16330	780	4	12	\N
16331	780	285	13	\N
16332	780	266	14	\N
16333	780	101	15	\N
16334	780	265	16	\N
16335	780	402	17	\N
16336	780	260	18	\N
16337	780	12	19	\N
16338	780	13	20	\N
16339	780	16	21	\N
16340	780	14	22	\N
16341	780	271	23	\N
16342	778	264	1	\N
16343	778	17	2	\N
16344	778	109	3	\N
16345	778	122	4	\N
16346	778	239	5	\N
16347	778	160	6	\N
16348	778	266	7	\N
16349	778	45	8	\N
16350	778	115	9	\N
16351	778	202	10	\N
16352	778	263	11	\N
16353	778	47	12	\N
16355	778	9	14	\N
16356	778	171	15	\N
16357	778	112	16	\N
16358	778	265	17	\N
16359	778	402	18	\N
16360	778	260	19	\N
16361	778	116	20	\N
16362	778	120	21	\N
16363	778	14	22	\N
16364	778	271	23	\N
16386	776	264	1	\N
16387	776	45	2	\N
16388	776	111	3	\N
16389	776	113	4	\N
16390	776	118	5	\N
16391	776	38	6	\N
16392	776	231	7	\N
16393	776	202	8	\N
16394	776	47	9	\N
16395	776	173	10	\N
16397	776	190	12	\N
16398	776	119	13	\N
16399	776	127	14	\N
16400	776	16	15	\N
16401	776	265	16	\N
16402	776	210	17	\N
16403	776	46	18	\N
16404	776	260	19	\N
16405	776	12	20	\N
16406	776	13	21	\N
16407	776	14	22	\N
16408	776	271	23	\N
16409	803	264	1	\N
16410	803	45	2	\N
16411	803	4	3	\N
16412	803	248	4	\N
16413	803	244	5	\N
16414	803	124	6	\N
16415	803	231	7	\N
16416	803	9	8	\N
16417	803	202	9	\N
16418	803	46	10	\N
16419	803	12	11	\N
16420	803	263	12	\N
16421	803	116	13	\N
16422	803	112	14	\N
16423	803	265	15	\N
16424	803	13	16	\N
16425	803	38	17	\N
16426	803	16	18	\N
16427	803	14	19	\N
16428	803	260	20	\N
16429	803	17	21	\N
16430	803	18	22	\N
16431	804	264	1	\N
16432	804	45	2	\N
16433	804	23	3	\N
16434	804	104	4	\N
16435	804	226	5	\N
16436	804	231	6	\N
16437	804	8	7	\N
16438	804	9	8	\N
16439	804	244	9	\N
16440	804	263	10	\N
16441	804	173	11	\N
16442	804	123	12	\N
16443	804	180	13	\N
16444	804	106	14	\N
16445	804	127	15	\N
16446	804	253	16	\N
16447	804	202	17	\N
16448	804	46	18	\N
16449	804	12	19	\N
16450	804	13	20	\N
16451	804	14	21	\N
16452	804	260	22	\N
16453	804	16	23	\N
16454	804	18	24	\N
16455	800	264	1	\N
16456	800	45	2	\N
16457	800	4	3	\N
16458	800	248	4	\N
16459	800	244	5	\N
16460	800	124	6	\N
16461	800	231	7	\N
16462	800	9	8	\N
16463	800	202	9	\N
16464	800	46	10	\N
16465	800	12	11	\N
16466	800	263	12	\N
16467	800	116	13	\N
16468	800	112	14	\N
16469	800	265	15	\N
16470	800	13	16	\N
16471	800	38	17	\N
16472	800	16	18	\N
16473	800	14	19	\N
16474	800	260	20	\N
16475	800	220	21	\N
16476	800	18	22	\N
16477	799	264	1	\N
16478	799	45	2	\N
16479	799	117	3	\N
16480	799	248	4	\N
16481	799	244	5	\N
16482	799	227	6	\N
16483	799	231	7	\N
16484	799	9	8	\N
16485	799	8	9	\N
16486	799	210	10	\N
16487	799	246	11	\N
16488	799	12	12	\N
16489	799	13	13	\N
16490	799	38	14	\N
16491	799	16	15	\N
16492	799	14	16	\N
16493	799	260	17	\N
16494	799	18	18	\N
16495	797	264	1	\N
16496	797	38	2	\N
16497	797	45	3	\N
16498	797	248	4	\N
16499	797	46	5	\N
16500	797	12	6	\N
16501	797	13	7	\N
16502	797	14	8	\N
16503	797	220	9	\N
16504	797	260	10	\N
16505	797	16	11	\N
16506	797	265	12	\N
16354	778	145	13	\N
16396	776	145	11	\N
16556	783	264	1	\N
16557	783	212	2	\N
16558	783	3	3	\N
16559	783	155	4	\N
16560	783	117	5	\N
16561	783	45	6	\N
16562	783	231	7	\N
16563	783	38	8	\N
16564	783	264	9	\N
16565	783	152	10	\N
16566	783	181	11	\N
16567	783	46	12	\N
16568	783	263	13	\N
16569	783	101	14	\N
16570	783	265	15	\N
16571	783	402	16	\N
16572	783	107	17	\N
16573	783	260	18	\N
16574	783	8	19	\N
16575	783	13	20	\N
16576	783	14	21	\N
16577	783	271	22	\N
12543	697	180	5	\N
12572	699	180	13	\N
11611	648	180	14	\N
11752	655	180	14	\N
13142	730	180	6	\N
16240	1193	180	10	\N
12203	677	200	3	\N
12823	714	200	4	\N
11043	613	200	2	\N
11621	649	200	3	\N
12864	716	200	4	\N
12903	718	200	4	\N
14810	1118	200	3	\N
15020	1131	200	3	\N
12083	671	204	10	\N
12181	676	204	5	\N
12211	677	204	11	\N
11727	654	204	10	\N
15591	1157	204	6	\N
15609	1158	204	6	\N
16146	1188	204	7	\N
16166	1189	204	8	\N
14117	894	250	17	\N
12495	692	257	3	\N
13359	740	257	11	\N
13498	748	257	18	\N
13932	869	257	11	\N
13953	870	257	11	\N
13546	750	402	11	\N
13566	752	402	13	\N
11929	663	207	16	\N
12016	668	207	10	\N
12308	681	207	16	\N
12330	682	207	15	\N
11058	613	207	17	\N
11552	645	207	16	\N
11592	647	207	16	\N
11856	660	207	9	\N
12968	722	207	3	\N
13118	728	207	14	\N
14118	894	177	18	\N
14141	898	177	16	\N
12702	708	360	12	\N
15452	1149	360	15	\N
11653	650	166	15	\N
13180	731	166	23	\N
16115	1186	166	5	\N
14300	1048	166	1	\N
14472	1102	166	7	\N
14490	1103	166	13	\N
14513	1104	166	14	\N
14535	1105	166	15	\N
14556	1106	166	13	\N
14575	1107	166	12	\N
14599	1108	166	15	\N
14644	1110	166	15	\N
14667	1111	166	15	\N
14733	1114	166	14	\N
14754	1115	166	14	\N
14775	1116	166	13	\N
15067	1133	166	13	\N
15481	1151	166	11	\N
15750	1166	166	12	\N
15772	1167	166	12	\N
15840	1170	166	12	\N
15863	1171	166	12	\N
15885	1172	166	12	\N
15906	1173	166	11	\N
15927	1174	166	11	\N
15948	1175	166	11	\N
15968	1176	166	10	\N
15987	1177	166	9	\N
16007	1178	166	9	\N
16027	1179	166	9	\N
16048	1180	166	10	\N
16131	1187	166	11	\N
15264	1141	145	10	\N
11941	664	277	5	\N
11948	665	277	3	\N
12029	668	277	23	\N
12664	706	277	16	\N
12303	681	145	11	\N
13647	759	145	3	\N
15308	1143	360	6	\N
15312	1143	145	10	\N
11796	657	180	15	\N
15218	1139	145	11	\N
10792	600	277	18	\N
10826	602	277	6	\N
10837	603	277	9	\N
10953	608	277	22	\N
16107	1185	277	7	\N
14072	892	277	17	\N
14096	893	277	21	\N
14121	894	277	21	\N
14148	898	277	23	\N
14159	907	277	5	\N
14169	909	277	6	\N
14178	916	277	6	\N
14195	918	277	15	\N
14207	925	277	9	\N
14216	927	277	7	\N
14228	928	277	9	\N
14253	939	277	23	\N
14262	961	277	7	\N
14284	969	277	19	\N
14295	1024	277	5	\N
14307	1048	277	8	\N
14316	1049	277	7	\N
14336	1094	277	17	\N
14364	1095	277	23	\N
14376	1096	277	8	\N
14386	1097	277	8	\N
14518	1104	277	19	\N
14540	1105	277	20	\N
14561	1106	277	18	\N
14581	1107	277	18	\N
14716	1113	277	19	\N
14738	1114	277	19	\N
14760	1115	277	20	\N
14827	1118	277	20	\N
14850	1119	277	21	\N
14870	1120	277	18	\N
14891	1121	277	18	\N
14902	1122	277	8	\N
14915	1123	277	11	\N
14928	1124	277	10	\N
14962	1126	277	14	\N
14971	1127	277	4	\N
14976	1128	277	2	\N
14995	1129	277	15	\N
15015	1130	277	17	\N
15034	1131	277	17	\N
15052	1132	277	16	\N
15075	1133	277	21	\N
15082	1134	277	3	\N
15128	1135	277	24	\N
15153	1136	277	21	\N
15181	1137	277	24	\N
15412	1147	277	18	\N
15460	1149	277	23	\N
15468	1150	277	7	\N
15486	1151	277	16	\N
15506	1152	277	16	\N
15562	1155	277	15	\N
15582	1156	277	16	\N
15600	1157	277	15	\N
15619	1158	277	16	\N
15638	1159	277	16	\N
15656	1160	277	15	\N
15673	1161	277	14	\N
15692	1162	277	15	\N
15778	1167	277	18	\N
15801	1168	277	19	\N
15824	1169	277	19	\N
15849	1170	277	21	\N
15871	1171	277	20	\N
16055	1180	277	17	\N
16204	1191	277	17	\N
16210	1192	277	1	\N
16624	784	264	1	\N
16625	784	45	2	\N
16626	784	111	3	\N
16627	784	239	4	\N
16628	784	263	5	\N
16629	784	135	6	\N
16630	784	149	7	\N
16631	784	201	8	\N
16632	784	244	9	\N
16633	784	115	10	\N
16634	784	116	11	\N
16635	784	47	12	\N
16636	784	266	13	\N
16637	784	217	14	\N
16638	784	171	15	\N
16639	784	402	16	\N
16640	784	160	17	\N
16641	784	120	18	\N
16642	784	126	19	\N
16643	784	259	20	\N
16644	784	12	21	\N
16645	784	14	22	\N
16669	786	264	1	\N
16670	786	207	2	\N
16671	786	233	3	\N
16672	786	239	4	\N
16673	786	135	5	\N
16674	786	149	6	\N
16675	786	113	7	\N
16676	786	9	8	\N
16677	786	8	9	\N
16678	786	152	10	\N
16679	786	198	11	\N
16680	786	266	12	\N
16681	786	134	13	\N
16682	786	217	14	\N
16683	786	402	15	\N
16684	786	260	16	\N
16685	786	126	17	\N
16686	786	115	18	\N
16687	786	120	19	\N
16688	786	155	20	\N
16689	786	265	21	\N
16690	786	271	22	\N
16691	785	264	1	\N
16692	785	45	2	\N
16693	785	111	3	\N
16694	785	117	4	\N
16695	785	197	5	\N
16696	785	231	6	\N
16697	785	138	7	\N
16698	785	46	8	\N
16699	785	3	9	\N
16700	785	116	10	\N
16701	785	47	11	\N
16702	785	95	12	\N
16703	785	259	13	\N
16704	785	171	14	\N
16705	785	101	15	\N
16706	785	215	16	\N
16707	785	253	17	\N
16708	785	160	18	\N
16709	785	13	19	\N
16710	785	12	20	\N
16711	785	38	21	\N
16712	785	14	22	\N
16713	785	238	23	\N
16714	787	264	1	\N
16715	787	45	2	\N
16716	787	122	3	\N
16717	787	107	4	\N
16718	787	239	5	\N
16719	787	263	6	\N
16720	787	231	7	\N
16721	787	138	8	\N
16722	787	8	9	\N
16723	787	111	10	\N
16724	787	198	11	\N
16725	787	116	12	\N
16726	787	160	13	\N
16727	787	101	14	\N
16728	787	402	15	\N
16729	787	260	16	\N
16730	787	126	17	\N
16731	787	38	18	\N
16732	787	14	19	\N
16733	787	265	20	\N
16734	787	271	21	\N
16735	787	13	22	\N
16736	788	264	1	\N
16737	788	277	2	\N
16738	788	38	3	\N
16739	788	111	4	\N
16740	788	248	5	\N
16741	788	135	6	\N
16742	788	95	7	\N
16743	788	13	8	\N
16744	788	45	9	\N
16746	788	46	11	\N
16747	788	47	12	\N
16748	788	266	13	\N
16749	788	180	14	\N
16750	788	260	15	\N
10883	605	277	20	\N
16751	788	402	16	\N
16752	788	120	17	\N
16753	788	4	18	\N
16754	788	3	19	\N
16755	788	14	20	\N
16756	788	265	21	\N
16757	788	271	22	\N
16758	789	264	1	\N
16759	789	138	2	\N
16760	789	111	3	\N
16761	789	239	4	\N
16762	789	197	5	\N
16763	789	134	6	\N
16764	789	45	7	\N
16766	789	135	9	\N
16767	789	126	10	\N
16768	789	47	11	\N
16769	789	266	12	\N
16770	789	217	13	\N
16771	789	402	14	\N
16772	789	248	15	\N
16773	789	4	16	\N
16774	789	160	17	\N
16775	789	260	18	\N
16776	789	120	19	\N
16777	789	3	20	\N
16778	789	271	21	\N
16801	766	264	1	\N
16802	766	154	2	\N
16803	766	3	3	\N
16804	766	248	4	\N
16805	766	118	5	\N
16806	766	285	6	\N
16807	766	212	7	\N
16808	766	139	8	\N
16809	766	116	9	\N
16810	766	182	10	\N
16811	766	260	11	\N
16812	766	186	12	\N
16813	766	253	13	\N
16814	766	120	14	\N
16815	766	107	15	\N
16816	766	4	16	\N
16817	766	13	17	\N
16818	766	178	18	\N
16819	766	271	19	\N
16820	766	98	20	\N
16821	765	264	1	\N
16822	765	121	2	\N
16823	765	114	3	\N
16824	765	306	4	\N
16825	765	185	5	\N
16826	765	122	6	\N
16827	765	109	7	\N
16828	765	113	8	\N
16829	765	187	9	\N
16830	765	192	10	\N
16831	765	150	11	\N
16832	765	171	12	\N
16833	765	177	13	\N
16834	765	127	14	\N
16835	765	17	15	\N
16836	765	181	16	\N
16837	765	155	17	\N
16838	765	14	18	\N
16839	765	265	19	\N
16840	765	38	20	\N
16841	765	202	21	\N
16842	765	102	22	\N
16862	768	141	1	\N
16863	768	306	2	\N
16864	768	135	3	\N
16865	768	248	4	\N
16866	768	121	5	\N
16867	768	190	6	\N
16868	768	170	7	\N
16869	768	122	8	\N
16870	768	263	9	\N
16871	768	4	10	\N
16872	768	285	11	\N
16873	768	180	12	\N
16874	768	229	13	\N
16875	768	222	14	\N
16876	768	10	15	\N
16877	768	260	16	\N
16878	768	13	17	\N
16879	768	14	18	\N
16880	768	271	19	\N
16881	769	141	1	\N
16882	769	114	2	\N
16883	769	212	3	\N
16884	769	204	4	\N
16885	769	178	5	\N
16886	769	231	6	\N
16887	769	197	7	\N
16888	769	117	8	\N
16889	769	113	9	\N
16890	769	17	10	\N
16891	769	251	11	\N
16892	769	150	12	\N
16893	769	402	13	\N
16894	769	241	14	\N
16896	769	8	16	\N
16897	769	126	17	\N
16898	769	38	18	\N
16899	769	271	19	\N
16900	769	220	20	\N
16901	771	141	1	\N
16902	771	117	2	\N
16903	771	111	3	\N
16904	771	195	4	\N
16905	771	213	5	\N
16906	771	38	6	\N
16907	771	184	7	\N
16908	771	187	8	\N
16909	771	10	9	\N
16910	771	17	10	\N
16911	771	4	11	\N
16912	771	159	12	\N
16913	771	285	13	\N
16914	771	254	14	\N
16915	771	229	15	\N
16916	771	125	16	\N
16917	771	5	17	\N
16918	771	14	18	\N
16919	771	271	19	\N
16920	771	155	20	\N
16921	771	349	21	\N
16922	770	141	1	\N
16923	770	202	2	\N
16924	770	118	3	\N
16925	770	174	4	\N
16926	770	239	5	\N
16927	770	13	6	\N
16928	770	159	7	\N
16929	770	122	8	\N
16930	770	115	9	\N
16931	770	361	10	\N
16932	770	208	11	\N
16934	770	45	13	\N
16935	770	265	14	\N
16936	770	186	15	\N
16937	770	229	16	\N
16938	770	113	17	\N
16939	770	212	18	\N
16940	770	3	19	\N
16941	770	16	20	\N
16942	770	271	21	\N
16943	772	141	1	\N
16944	772	174	2	\N
16945	772	248	3	\N
16946	772	111	4	\N
16947	772	170	5	\N
16948	772	117	6	\N
16949	772	307	7	\N
16950	772	138	8	\N
16951	772	226	9	\N
16952	772	239	10	\N
16933	770	145	12	\N
16953	772	202	11	\N
16954	772	38	12	\N
16955	772	120	13	\N
16956	772	260	14	\N
16957	772	186	15	\N
16958	772	210	16	\N
16959	772	155	17	\N
16960	772	152	18	\N
16961	772	12	19	\N
16962	772	14	20	\N
16963	772	265	21	\N
16895	769	24	15	\N
16964	773	264	1	\N
16965	773	185	2	\N
16966	773	247	3	\N
16967	773	126	4	\N
16968	773	99	5	\N
16969	773	98	6	\N
16970	773	114	7	\N
16972	773	113	9	\N
16973	773	142	10	\N
16974	773	263	11	\N
16975	773	173	12	\N
16976	773	45	13	\N
16977	773	150	14	\N
16978	773	402	15	\N
16979	773	124	16	\N
16980	773	8	17	\N
16981	773	116	18	\N
16982	773	13	19	\N
16983	773	271	20	\N
16984	774	141	1	\N
16985	774	212	2	\N
16986	774	111	3	\N
16987	774	113	4	\N
16988	774	244	5	\N
16989	774	98	6	\N
16990	774	254	7	\N
16991	774	45	8	\N
16992	774	24	9	\N
16993	774	138	10	\N
16994	774	202	11	\N
16995	774	142	12	\N
16996	774	47	13	\N
16997	774	231	14	\N
16998	774	285	15	\N
16999	774	127	16	\N
17000	774	261	17	\N
17001	774	210	18	\N
17002	774	260	19	\N
17003	774	3	20	\N
17004	774	12	21	\N
17005	774	14	22	\N
17006	774	271	23	\N
17007	775	264	1	\N
17008	775	94	2	\N
17009	775	248	3	\N
17010	775	99	4	\N
17011	775	190	5	\N
17012	775	13	6	\N
17013	775	307	7	\N
17014	775	120	8	\N
17015	775	105	9	\N
17016	775	114	10	\N
17017	775	174	11	\N
17018	775	38	12	\N
17019	775	173	13	\N
17020	775	119	14	\N
17021	775	186	15	\N
17022	775	150	16	\N
17023	775	402	17	\N
17024	775	118	18	\N
17025	775	116	19	\N
17026	775	152	20	\N
17027	775	126	21	\N
17028	775	265	22	\N
17029	775	220	23	\N
17030	791	252	1	\N
17031	791	212	2	\N
17032	791	111	3	\N
17033	791	233	4	\N
17034	791	248	5	\N
17035	791	45	6	\N
17036	791	239	7	\N
17037	791	121	8	\N
17038	791	197	9	\N
17039	791	46	10	\N
17040	791	261	11	\N
17041	791	101	12	\N
17042	791	285	13	\N
17043	791	402	14	\N
17044	791	202	15	\N
17045	791	213	16	\N
17046	791	13	17	\N
17047	791	14	18	\N
17048	791	260	19	\N
17049	791	265	20	\N
17050	791	141	21	\N
17051	791	38	22	\N
17052	790	252	1	\N
17053	790	109	2	\N
17054	790	17	3	\N
17055	790	239	4	\N
17056	790	248	5	\N
17057	790	45	6	\N
17058	790	179	7	\N
17059	790	197	8	\N
17060	790	46	9	\N
17061	790	12	10	\N
17062	790	151	11	\N
17063	790	124	12	\N
17064	790	402	13	\N
17065	790	241	14	\N
17066	790	3	15	\N
17067	790	13	16	\N
17068	790	14	17	\N
17069	790	260	18	\N
17070	790	265	19	\N
17071	790	155	20	\N
17072	793	404	1	\N
17073	793	115	2	\N
17074	793	17	3	\N
17075	793	233	4	\N
17076	793	248	5	\N
17077	793	208	6	\N
17078	793	155	7	\N
17079	793	200	8	\N
17080	793	237	9	\N
17081	793	46	10	\N
17082	793	168	11	\N
17083	793	101	12	\N
17084	793	285	13	\N
17085	793	402	14	\N
17086	793	241	15	\N
17087	793	3	16	\N
17088	793	13	17	\N
17089	793	14	18	\N
17090	793	260	19	\N
17091	793	265	20	\N
17111	792	404	1	\N
17112	792	115	2	\N
17113	792	17	3	\N
17114	792	233	4	\N
17115	792	248	5	\N
17116	792	208	6	\N
17117	792	155	7	\N
17118	792	200	8	\N
17119	792	237	9	\N
17120	792	46	10	\N
17121	792	168	11	\N
17122	792	101	12	\N
17123	792	232	13	\N
17124	792	402	14	\N
17125	792	241	15	\N
17126	792	3	16	\N
17127	792	13	17	\N
17128	792	14	18	\N
17129	792	260	19	\N
17130	792	265	20	\N
17131	794	406	1	\N
17132	794	38	2	\N
17133	794	45	3	\N
17134	794	155	4	\N
17135	794	46	5	\N
17136	794	13	6	\N
17137	794	14	7	\N
17138	794	260	8	\N
17139	794	265	9	\N
16971	773	145	8	\N
17180	801	264	1	\N
17181	801	45	2	\N
17182	801	212	3	\N
17183	801	244	4	\N
17184	801	114	5	\N
17185	801	24	6	\N
17186	801	46	7	\N
17187	801	9	8	\N
17188	801	202	9	\N
17189	801	263	10	\N
17190	801	152	11	\N
17191	801	261	12	\N
17192	801	106	13	\N
17193	801	245	14	\N
17194	801	125	15	\N
17195	801	116	16	\N
17196	801	260	17	\N
17197	801	14	18	\N
17198	801	265	19	\N
17199	801	13	20	\N
17200	802	264	1	\N
17201	802	45	2	\N
17202	802	8	3	\N
17203	802	244	4	\N
17204	802	114	5	\N
17205	802	231	6	\N
17206	802	9	7	\N
17207	802	202	8	\N
17208	802	263	9	\N
17209	802	123	10	\N
17210	802	259	11	\N
17211	802	180	12	\N
17212	802	106	13	\N
17213	802	253	14	\N
17214	802	4	15	\N
17215	802	116	16	\N
17216	802	260	17	\N
17217	802	14	18	\N
17218	802	265	19	\N
17219	802	13	20	\N
17220	805	45	1	\N
17221	805	38	2	\N
17222	805	46	3	\N
17223	805	248	4	\N
17224	805	12	5	\N
17225	805	13	6	\N
17226	805	14	7	\N
17227	805	220	8	\N
17228	805	260	9	\N
17229	806	45	1	\N
17230	806	38	2	\N
17231	806	46	3	\N
17232	806	12	4	\N
17233	806	248	5	\N
17234	806	13	6	\N
17235	806	16	7	\N
17236	806	14	8	\N
17237	806	220	9	\N
17238	807	45	1	\N
17239	807	38	2	\N
17240	807	46	3	\N
17241	807	12	4	\N
17242	807	248	5	\N
17243	807	13	6	\N
17244	807	16	7	\N
17245	807	14	8	\N
17246	807	220	9	\N
17247	808	264	1	\N
17248	808	155	2	\N
17249	808	122	3	\N
17250	808	248	4	\N
17251	808	152	5	\N
17252	808	16	6	\N
17253	808	45	7	\N
17254	808	202	8	\N
17255	808	163	9	\N
17256	808	263	10	\N
17257	808	46	11	\N
17258	808	246	12	\N
17259	808	261	13	\N
17260	808	240	14	\N
17261	808	253	15	\N
17262	808	125	16	\N
17263	808	4	17	\N
17264	808	13	18	\N
17265	808	14	19	\N
17266	808	260	20	\N
17267	808	18	21	\N
17288	809	264	1	\N
17289	809	184	2	\N
17290	809	306	3	\N
17291	809	45	4	\N
17292	809	99	5	\N
17293	809	120	6	\N
17294	809	124	7	\N
17295	809	222	8	\N
17296	809	195	9	\N
17297	809	263	10	\N
17298	809	46	11	\N
17299	809	261	12	\N
17300	809	171	13	\N
17301	809	262	14	\N
17302	809	253	15	\N
17303	809	102	16	\N
17304	809	114	17	\N
17305	809	126	18	\N
17306	809	14	19	\N
17307	809	260	20	\N
17308	810	264	1	\N
17309	810	155	2	\N
17310	810	122	3	\N
17311	810	248	4	\N
17312	810	247	5	\N
17313	810	95	6	\N
17314	810	135	7	\N
17315	810	45	8	\N
17316	810	263	9	\N
17317	810	46	10	\N
17318	810	259	11	\N
17319	810	127	12	\N
17320	810	171	13	\N
17321	810	261	14	\N
17322	810	253	15	\N
17323	810	113	16	\N
17324	810	152	17	\N
17325	810	126	18	\N
17326	810	14	19	\N
17327	810	260	20	\N
17328	810	220	21	\N
17329	811	264	1	\N
17330	811	45	2	\N
17331	811	248	3	\N
17332	811	122	4	\N
17333	811	46	5	\N
17334	811	13	6	\N
17335	811	38	7	\N
17336	811	14	8	\N
17337	811	260	9	\N
17338	811	220	10	\N
17339	813	14	1	\N
17340	813	13	2	\N
17341	813	306	3	\N
17342	813	45	4	\N
17343	813	99	5	\N
17344	813	7	6	\N
17345	813	124	7	\N
17346	813	222	8	\N
17347	813	195	9	\N
17348	813	263	10	\N
17349	813	261	11	\N
17350	813	171	12	\N
17351	813	262	13	\N
17352	813	253	14	\N
17353	813	202	15	\N
17354	813	114	16	\N
17355	813	126	17	\N
17356	813	14	18	\N
17357	813	260	19	\N
17358	814	14	1	\N
17359	814	155	2	\N
17360	814	122	3	\N
17361	814	248	4	\N
17362	814	247	5	\N
17363	814	16	6	\N
17364	814	135	7	\N
17365	814	45	8	\N
17366	814	95	9	\N
17367	814	263	10	\N
17368	814	46	11	\N
17369	814	259	12	\N
17370	814	261	13	\N
17371	814	262	14	\N
17372	814	253	15	\N
17373	814	113	16	\N
17374	814	152	17	\N
17375	814	126	18	\N
17376	814	14	19	\N
17377	814	260	20	\N
17400	812	264	1	\N
17401	812	258	2	\N
17402	812	102	3	\N
17403	812	125	4	\N
17404	812	45	5	\N
17405	812	98	6	\N
17406	812	181	7	\N
17407	812	142	8	\N
17408	812	306	9	\N
17409	812	46	10	\N
17410	812	127	11	\N
17411	812	261	12	\N
17412	812	262	13	\N
17413	812	177	14	\N
17414	812	120	15	\N
17415	812	154	16	\N
17416	812	141	17	\N
17417	812	38	18	\N
17418	812	14	19	\N
17419	812	260	20	\N
17420	812	240	21	\N
17421	815	264	1	\N
17422	815	155	2	\N
17423	815	122	3	\N
17424	815	248	4	\N
17425	815	152	5	\N
17426	815	184	6	\N
17427	815	45	7	\N
17428	815	202	8	\N
17429	815	263	9	\N
17430	815	46	10	\N
17431	815	140	11	\N
17432	815	17	12	\N
17433	815	246	13	\N
17434	815	253	14	\N
17435	815	125	15	\N
17436	815	126	16	\N
17437	815	141	17	\N
17438	815	38	18	\N
17439	815	14	19	\N
17440	815	260	20	\N
17441	817	264	1	\N
17442	817	140	2	\N
17443	817	306	3	\N
17444	817	45	4	\N
17445	817	99	5	\N
17446	817	254	6	\N
17447	817	222	7	\N
17448	817	17	8	\N
17449	817	195	9	\N
17450	817	263	10	\N
17451	817	46	11	\N
17452	817	127	12	\N
17453	817	261	13	\N
17454	817	262	14	\N
17455	817	253	15	\N
17456	817	202	16	\N
17457	817	126	17	\N
17458	817	114	18	\N
17459	817	14	19	\N
17460	817	260	20	\N
17461	816	264	1	\N
17462	816	155	2	\N
17463	816	248	3	\N
17464	816	122	4	\N
17465	816	152	5	\N
17466	816	124	6	\N
17467	816	135	7	\N
17468	816	45	8	\N
17469	816	178	9	\N
17470	816	263	10	\N
17471	816	46	11	\N
17472	816	259	12	\N
17473	816	261	13	\N
17474	816	245	14	\N
17475	816	5	15	\N
17476	816	126	16	\N
17477	816	13	17	\N
17478	816	14	18	\N
17479	816	260	19	\N
17480	818	264	1	\N
17481	818	306	2	\N
17482	818	135	3	\N
17483	818	125	4	\N
17484	818	10	5	\N
17485	818	195	6	\N
17486	818	100	7	\N
17487	818	122	8	\N
17488	818	263	9	\N
17489	818	46	10	\N
17490	818	12	11	\N
17491	818	108	12	\N
17492	818	261	13	\N
17493	818	262	14	\N
17494	818	253	15	\N
17495	818	4	16	\N
17496	818	13	17	\N
17497	818	285	18	\N
17498	818	14	19	\N
17499	818	260	20	\N
17521	819	264	1	\N
17522	819	45	2	\N
17523	819	248	3	\N
17524	819	254	4	\N
17525	819	251	5	\N
17526	819	178	6	\N
17527	819	152	7	\N
17528	819	263	8	\N
17529	819	46	9	\N
17530	819	259	10	\N
17531	819	257	11	\N
17532	819	127	12	\N
17533	819	261	13	\N
17534	819	262	14	\N
17535	819	253	15	\N
17536	819	185	16	\N
17537	819	126	17	\N
17538	819	125	18	\N
17539	819	14	19	\N
17540	819	260	20	\N
17541	820	264	1	\N
17542	820	222	2	\N
17543	820	45	3	\N
17544	820	248	4	\N
17545	820	99	5	\N
17546	820	190	6	\N
17547	820	152	7	\N
17548	820	172	8	\N
17549	820	178	9	\N
17550	820	263	10	\N
17551	820	46	11	\N
17552	820	258	12	\N
17553	820	261	13	\N
17554	820	262	14	\N
17555	820	245	15	\N
17556	820	126	16	\N
17557	820	277	17	\N
17558	820	38	18	\N
17559	820	16	19	\N
17560	820	14	20	\N
17561	820	260	21	\N
17562	821	264	1	\N
17563	821	184	2	\N
17564	821	17	3	\N
17565	821	241	4	\N
17566	821	117	5	\N
17567	821	231	6	\N
17568	821	45	7	\N
17569	821	115	8	\N
17570	821	125	9	\N
17571	821	258	10	\N
17572	821	257	11	\N
17573	821	261	12	\N
17574	821	262	13	\N
17575	821	253	14	\N
17576	821	160	15	\N
17577	821	10	16	\N
17578	821	13	17	\N
17579	821	141	18	\N
17580	821	38	19	\N
17581	821	260	20	\N
17582	821	14	21	\N
17583	822	264	1	\N
17584	822	155	2	\N
17585	822	45	3	\N
17586	822	248	4	\N
17587	822	46	5	\N
17588	822	251	6	\N
17589	822	125	7	\N
17590	822	152	8	\N
17591	822	178	9	\N
17592	822	263	10	\N
17593	822	259	11	\N
17594	822	261	12	\N
17595	822	262	13	\N
17596	822	253	14	\N
17597	822	185	15	\N
17598	822	126	16	\N
17599	822	13	17	\N
17600	822	14	18	\N
17601	822	260	19	\N
17621	823	264	1	\N
17622	823	222	2	\N
17623	823	45	3	\N
17624	823	248	4	\N
17625	823	190	5	\N
17626	823	254	6	\N
17627	823	122	7	\N
17628	823	172	8	\N
17629	823	178	9	\N
17630	823	263	10	\N
17631	823	46	11	\N
17632	823	127	12	\N
17633	823	261	13	\N
17634	823	262	14	\N
17635	823	253	15	\N
17636	823	126	16	\N
17637	823	260	17	\N
17638	823	16	18	\N
17639	823	14	19	\N
17640	823	220	20	\N
17641	824	264	1	\N
17642	824	222	2	\N
17643	824	45	3	\N
17644	824	248	4	\N
17645	824	24	5	\N
17646	824	10	6	\N
17647	824	205	7	\N
17648	824	135	8	\N
17649	824	126	9	\N
17650	824	46	10	\N
17651	824	263	11	\N
17652	824	127	12	\N
17653	824	261	13	\N
17654	824	262	14	\N
17655	824	245	15	\N
17656	824	13	16	\N
17657	824	141	17	\N
17658	824	38	18	\N
17659	824	14	19	\N
17660	824	260	20	\N
17661	824	220	21	\N
17662	826	264	1	\N
17663	826	222	2	\N
17664	826	45	3	\N
17665	826	121	4	\N
17666	826	99	5	\N
17667	826	254	6	\N
17668	826	135	7	\N
17669	826	152	8	\N
17670	826	172	9	\N
17671	826	178	10	\N
17672	826	263	11	\N
17673	826	261	12	\N
17674	826	262	13	\N
17675	826	253	14	\N
17676	826	185	15	\N
17677	826	126	16	\N
17678	826	113	17	\N
17679	826	110	18	\N
17680	826	14	19	\N
17681	826	260	20	\N
17682	825	264	1	\N
17683	825	222	2	\N
17684	825	45	3	\N
17685	825	125	4	\N
17686	825	190	5	\N
17687	825	16	6	\N
17688	825	152	7	\N
17689	825	105	8	\N
17690	825	178	9	\N
17691	825	263	10	\N
17692	825	46	11	\N
17693	825	261	12	\N
17694	825	262	13	\N
17695	825	253	14	\N
17696	825	155	15	\N
17697	825	126	16	\N
17698	825	160	17	\N
17699	825	14	18	\N
17700	825	260	19	\N
17701	827	264	1	\N
17702	827	155	2	\N
17703	827	248	3	\N
17704	827	122	4	\N
17705	827	212	5	\N
17706	827	178	6	\N
17707	827	16	7	\N
17708	827	45	8	\N
17709	827	46	9	\N
17710	827	3	10	\N
17711	827	263	11	\N
17712	827	246	12	\N
17713	827	186	13	\N
17714	827	261	14	\N
17715	827	245	15	\N
17716	827	13	16	\N
17717	827	38	17	\N
17718	827	14	18	\N
17719	827	260	19	\N
17720	827	220	20	\N
17721	829	264	1	\N
17722	829	160	2	\N
17723	829	125	3	\N
17724	829	152	4	\N
17725	829	190	5	\N
17726	829	205	6	\N
17727	829	45	7	\N
17728	829	263	8	\N
17729	829	46	9	\N
17730	829	12	10	\N
17731	829	261	11	\N
17732	829	262	12	\N
17733	829	253	13	\N
17734	829	185	14	\N
17735	829	4	15	\N
17736	829	120	16	\N
17737	829	14	17	\N
17738	829	260	18	\N
17739	828	264	1	\N
17740	828	105	2	\N
17741	828	121	3	\N
17742	828	99	4	\N
17743	828	254	5	\N
17744	828	151	6	\N
17745	828	45	7	\N
17746	828	125	8	\N
17747	828	172	9	\N
17748	828	178	10	\N
17749	828	259	11	\N
17750	828	127	12	\N
17751	828	261	13	\N
17752	828	262	14	\N
17753	828	253	15	\N
17754	828	126	16	\N
17755	828	263	17	\N
17756	828	113	18	\N
17757	828	14	19	\N
17758	828	260	20	\N
17759	798	264	1	\N
17760	798	38	2	\N
17761	798	45	3	\N
17762	798	248	4	\N
17763	798	102	5	\N
17764	798	254	6	\N
17765	798	126	7	\N
17766	798	116	8	\N
17767	798	12	9	\N
17768	798	13	10	\N
17769	798	112	11	\N
17770	798	402	12	\N
17771	798	114	13	\N
17772	798	160	14	\N
17773	798	107	15	\N
17774	798	260	16	\N
17775	798	16	17	\N
17776	798	265	18	\N
12423	686	5	18	\N
11088	615	5	4	\N
10993	610	422	17	\N
10996	610	317	20	\N
10997	610	14	21	\N
10998	610	131	22	\N
11026	612	422	6	\N
11027	612	311	7	\N
11028	612	270	8	\N
11029	612	208	9	\N
11030	612	281	10	\N
11031	612	124	11	\N
11032	612	169	12	\N
11033	612	206	13	\N
11034	612	279	14	\N
11036	612	94	16	\N
11037	612	133	17	\N
11038	612	7	18	\N
11039	612	9	19	\N
11040	612	312	20	\N
11041	612	317	21	\N
11411	635	422	5	\N
11413	635	6	7	\N
11414	635	269	8	\N
11415	635	152	9	\N
11416	635	309	10	\N
11417	635	171	11	\N
11418	635	279	12	\N
11419	635	173	13	\N
11420	635	312	14	\N
11421	635	151	15	\N
11422	635	132	16	\N
11423	635	133	17	\N
11424	635	185	18	\N
11425	635	18	19	\N
11505	643	422	10	\N
11511	643	279	16	\N
11513	643	132	18	\N
11514	643	133	19	\N
11515	643	17	20	\N
11516	643	131	21	\N
11512	643	207	17	\N
11668	651	422	9	\N
11673	651	279	14	\N
11674	651	132	15	\N
11675	651	133	16	\N
11676	651	130	17	\N
11677	651	271	18	\N
11669	651	360	10	\N
11791	657	422	10	\N
11793	657	176	12	\N
11794	657	269	13	\N
11795	657	246	14	\N
11797	657	279	16	\N
11798	657	124	17	\N
11799	657	202	18	\N
11800	657	155	19	\N
11801	657	133	20	\N
11802	657	130	21	\N
11803	657	260	22	\N
11804	657	186	23	\N
11805	657	17	24	\N
11792	657	116	11	\N
11877	661	422	8	\N
11883	661	16	14	\N
11884	661	226	15	\N
11885	661	279	16	\N
11886	661	132	17	\N
11887	661	133	18	\N
11888	661	190	19	\N
11889	661	130	20	\N
11890	661	14	21	\N
11891	661	220	22	\N
11892	661	390	23	\N
12805	713	422	7	\N
12806	713	126	8	\N
12807	713	270	9	\N
12808	713	174	10	\N
12809	713	155	11	\N
12810	713	340	12	\N
12811	713	148	13	\N
12812	713	279	14	\N
12813	713	213	15	\N
12815	713	6	17	\N
12816	713	269	18	\N
12817	713	130	19	\N
12818	713	14	20	\N
12819	713	151	21	\N
12814	713	198	16	\N
12998	723	422	10	\N
13002	723	186	14	\N
13003	723	45	15	\N
13005	723	210	17	\N
13007	723	38	19	\N
13008	723	13	20	\N
13009	723	6	21	\N
13010	723	271	22	\N
13011	723	209	23	\N
13000	723	360	12	\N
13004	723	402	16	\N
13006	723	277	18	\N
13043	725	422	8	\N
13044	725	120	9	\N
13045	725	169	10	\N
13046	725	100	11	\N
13047	725	159	12	\N
13048	725	267	13	\N
13049	725	186	14	\N
13050	725	255	15	\N
13052	725	271	17	\N
13053	725	6	18	\N
13054	725	269	19	\N
13055	725	13	20	\N
13056	725	14	21	\N
13057	725	260	22	\N
13058	725	112	23	\N
13059	725	285	24	\N
13211	733	422	9	\N
13215	733	273	13	\N
13216	733	376	14	\N
13218	733	210	16	\N
13220	733	38	18	\N
13221	733	13	19	\N
13222	733	271	20	\N
13223	733	269	21	\N
13224	733	12	22	\N
13225	733	14	23	\N
13226	733	272	24	\N
13219	733	277	17	\N
15212	1139	422	5	\N
15223	1139	167	16	\N
15224	1139	170	17	\N
15225	1139	154	18	\N
15226	1139	190	19	\N
15227	1139	117	20	\N
15228	1139	241	21	\N
15230	1139	38	23	\N
15231	1139	285	24	\N
15213	1139	360	6	\N
15229	1139	277	22	\N
15259	1141	422	5	\N
15261	1141	173	7	\N
15262	1141	139	8	\N
15263	1141	152	9	\N
15265	1141	419	11	\N
15266	1141	168	12	\N
15267	1141	148	13	\N
15268	1141	97	14	\N
15269	1141	7	15	\N
15270	1141	112	16	\N
15271	1141	167	17	\N
15272	1141	170	18	\N
15273	1141	154	19	\N
15274	1141	190	20	\N
15275	1141	117	21	\N
15276	1141	241	22	\N
15278	1141	38	24	\N
15279	1141	285	25	\N
15260	1141	360	6	\N
15277	1141	277	23	\N
15307	1143	422	5	\N
15309	1143	173	7	\N
15310	1143	139	8	\N
15311	1143	152	9	\N
15313	1143	148	11	\N
15314	1143	97	12	\N
15315	1143	7	13	\N
15316	1143	112	14	\N
15317	1143	167	15	\N
15318	1143	170	16	\N
15319	1143	154	17	\N
15320	1143	190	18	\N
15321	1143	117	19	\N
15322	1143	241	20	\N
15324	1143	38	22	\N
15325	1143	285	23	\N
15323	1143	277	21	\N
15352	1145	422	5	\N
15362	1145	167	15	\N
15363	1145	170	16	\N
15364	1145	154	17	\N
15365	1145	190	18	\N
15366	1145	117	19	\N
15367	1145	241	20	\N
15369	1145	38	22	\N
15370	1145	419	23	\N
15371	1145	168	24	\N
15372	1145	285	25	\N
15353	1145	360	6	\N
15357	1145	145	10	\N
15368	1145	277	21	\N
\.


--
-- Data for Name: songs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.songs (id, title, album, release_year, mv_url, author) FROM stdin;
110	クオリア	LIFE 6 SENSE	\N	\N	\N
124	EDENへ	UNSER	\N	\N	\N
2	VICTOSPIN	ENIGMASIS	\N	\N	\N
123	GOOD and EVIL	UNSER	\N	\N	\N
127	NAMELY	30	\N	\N	\N
1	ENIGMASIS	ENIGMASIS	\N	\N	\N
134	ai ta心	Timeless	\N	\N	\N
9	シリウス	TYCOON	\N	\N	\N
47	One Last Time	UNSER	\N	\N	\N
129	EYES OF THE FUTURE	Single	\N	\N	\N
46	Making it Drive	UNSER	\N	\N	\N
8	Q.E.D.	TYCOON	\N	\N	\N
121	DECIDED	TYCOON	\N	\N	\N
119	ALL ALONE	TYCOON	\N	\N	\N
112	THE OVER	THE ONE	\N	\N	\N
208	AWAYOKUBA-斬る	THE ONE	\N	\N	\N
24	KINJITO	THE ONE	\N	\N	\N
111	BABY BORN & GO	LIFE 6 SENSE	\N	\N	\N
202	ace of ace	LIFE 6 SENSE	\N	\N	\N
5	No.1	LIFE 6 SENSE	\N	\N	\N
6	ビタースウィート	ENIGMASIS	\N	\N	\N
133	MMH	EPIPHANY	\N	\N	\N
113	REVERSI	Ø CHOIR	\N	\N	\N
109	GOLD	LAST	\N	\N	\N
403	ET	\N	\N	\N	\N
402	ANOMALY奏者	Ø CHOIR	\N	\N	\N
145	〜流れ・空虚・THIS WORD〜	BUGRIGHT	\N	\N	\N
23	FIGHT FOR LIBERTY	Ø CHOIR	\N	\N	\N
130	Eye's Sentry	EPIPHANY	\N	\N	\N
132	PHOENIX	EPIPHANY	\N	\N	\N
135	トキノナミダ	Timeless	\N	\N	\N
136	優しさの雫	Timeless	\N	\N	\N
137	扉	Timeless	\N	\N	\N
139	Nitro	Timeless	\N	\N	\N
140	Lump Of Affection	Timeless	\N	\N	\N
141	SE	Timeless	\N	\N	\N
100	SHAMROCK	Timeless	\N	\N	\N
143	Home	BUGRIGHT	\N	\N	\N
147	一人じゃないから	BUGRIGHT	\N	\N	\N
148	SORA	BUGRIGHT	\N	\N	\N
150	51%	BUGRIGHT	\N	\N	\N
151	LIFEsize	BUGRIGHT	\N	\N	\N
152	EMPTY96	BUGRIGHT	\N	\N	\N
154	DISCORD	BUGRIGHT	\N	\N	\N
102	endscape	BUGRIGHT	\N	\N	\N
103	シャカビーチ〜Laka Laka La〜	BUGRIGHT	\N	\N	\N
101	君の好きなうた	BUGRIGHT	\N	\N	\N
7	CHANCE!	Timeless	\N	\N	\N
94	激動	PROGLUTION	\N	\N	\N
105	Just break the limit!	PROGLUTION	\N	\N	\N
106	恋いしくて	PROGLUTION	\N	\N	\N
166	志-kokorozashi-	PROGLUTION	\N	\N	\N
167	over the stoic	PROGLUTION	\N	\N	\N
168	体温	PROGLUTION	\N	\N	\N
169	ハルジオン	PROGLUTION	\N	\N	\N
171	美影意志	PROGLUTION	\N	\N	\N
172	コロナ	PROGLUTION	\N	\N	\N
173	earthy world	PROGLUTION	\N	\N	\N
176	Forget	PROGLUTION	\N	\N	\N
177	和音	PROGLUTION	\N	\N	\N
178	YURA YURA	PROGLUTION	\N	\N	\N
155	UNKNOWN ORCHESTRA	PROGLUTION	\N	\N	\N
157	Rainy	PROGLUTION	\N	\N	\N
158	sorrow	PROGLUTION	\N	\N	\N
159	energy	PROGLUTION	\N	\N	\N
160	Roots	PROGLUTION	\N	\N	\N
161	病的希求日記	PROGLUTION	\N	\N	\N
163	神集め	PROGLUTION	\N	\N	\N
165	オトノハ	PROGLUTION	\N	\N	\N
142	ゼロの答	BUGRIGHT	\N	\N	\N
108	哀しみはきっと	AwakEVE	\N	\N	\N
179	the truth	AwakEVE	\N	\N	\N
180	マダラ蝶	AwakEVE	\N	\N	\N
181	撃破	AwakEVE	\N	\N	\N
182	CHANGE	AwakEVE	\N	\N	\N
183	MINORI	AwakEVE	\N	\N	\N
185	スパルタ	AwakEVE	\N	\N	\N
186	心とココロ	AwakEVE	\N	\N	\N
187	バーレル	AwakEVE	\N	\N	\N
190	WANNA be BRILLIANT	AwakEVE	\N	\N	\N
191	君のまま	AwakEVE	\N	\N	\N
192	若さ故エンテレケイア	AwakEVE	\N	\N	\N
221	AWAKE	AwakEVE	\N	\N	\N
193	Ultimate	LAST	\N	\N	\N
196	超大作＋81	LAST	\N	\N	\N
197	パニックワールド	LAST	\N	\N	\N
198	魑魅魍魎マーチ	LAST	\N	\N	\N
199	境地・マントラ	LAST	\N	\N	\N
201	一石を投じる　Tokyo midnight sun	LAST	\N	\N	\N
218	LIFE	LAST	\N	\N	\N
10	Gold	LIFE 6 SENSE	\N	\N	\N
203	シークレット	LIFE 6 SENSE	\N	\N	\N
205	一億分の一の小説	LIFE 6 SENSE	\N	\N	\N
206	白昼夢	LIFE 6 SENSE	\N	\N	\N
222	Rush	LIFE 6 SENSE	\N	\N	\N
4	CORE PRIDE	THE ONE	\N	\N	\N
210	Massive	THE ONE	\N	\N	\N
212	Don't Think.Feel	THE ONE	\N	\N	\N
213	LIMITLESS	THE ONE	\N	\N	\N
214	23ワード	THE ONE	\N	\N	\N
215	此処から	THE ONE	\N	\N	\N
216	boy	THE ONE	\N	\N	\N
217	a LOVELY TONE	THE ONE	\N	\N	\N
18	MONDO PIECE	THE ONE	\N	\N	\N
114	Fight For Liberty	Ø CHOIR	\N	\N	\N
115	Wizard CLUB	Ø CHOIR	\N	\N	\N
17	7th Trigger	THE ONE	\N	\N	\N
118	WE ARE GO	TYCOON	\N	\N	\N
3	ナノ・セカンド	Ø CHOIR	\N	\N	\N
117	I LOVE THE WORLD	TYCOON	\N	\N	\N
120	一滴の影響	TYCOON	\N	\N	\N
116	僕の言葉ではない これは僕達の言葉	TYCOON	\N	\N	\N
12	PRAYING RUN	TYCOON	\N	\N	\N
13	Touch off	UNSER	\N	\N	\N
125	ROB THE FRONTIER	UNSER	\N	\N	\N
16	AFTER LIFE	UNSER	\N	\N	\N
126	AS ONE	30	\N	\N	\N
45	AVALANCHE	30	\N	\N	\N
96	NEW WORLD	Single	\N	\N	\N
14	EN	30	\N	\N	\N
219	DEJAVU	LAST	\N	\N	\N
107	GO-ON	AwakEVE	\N	\N	\N
104	浮世CROSSING	PROGLUTION	\N	\N	\N
223	UNISON	LIFE 6 SENSE	\N	\N	\N
38	IMPACT	LIFE 6 SENSE	\N	\N	\N
344	-forecast map 1955-	PROGLUTION	\N	\N	\N
345	-god's followers-	PROGLUTION	\N	\N	\N
346	-妙策号外ORCHESTRA-	PROGLUTION	\N	\N	\N
348	CHANCE!04	Single	\N	\N	\N
349	DIS is TEKI	Single	\N	\N	\N
350	Extreme	Single	\N	\N	\N
351	Mixed-Up	Single	\N	\N	\N
353	Secret	LIFE 6 SENSE	\N	\N	\N
354	UVER Battle Royal	Single	\N	\N	\N
356	core ability +81	Single	\N	\N	\N
357	expod -digital	PROGLUTION	\N	\N	\N
359	アイ・アム Riri	AwakEVE	\N	\N	\N
360	ハイ!問題作	LAST	\N	\N	\N
361	バーベル	THE ONE	\N	\N	\N
364	僕に重なって来る今	Single	\N	\N	\N
391	Last Christmas	\N	\N	\N	\N
393	Gangnam Style	\N	\N	\N	\N
396	Mainstream	\N	\N	\N	\N
149	シャルマンノウラ	BUGRIGHT	\N	\N	\N
97	D-tecnoLife	Timeless	\N	\N	\N
170	99/100騙しの哲	PROGLUTION	\N	\N	\N
406	Drum Solo	\N	\N	\N	\N
164	心が指す場所と口癖　そして君がついて来る	PROGLUTION	\N	\N	\N
312	Bye-Bye to you	EPIPHANY	\N	\N	\N
184	world LOST world	AwakEVE	\N	\N	\N
95	儚くも永久のカナシ	PROGLUTION	\N	\N	\N
200	いつか必ず死ぬことを忘れるな	LAST	\N	\N	\N
329	.über cozy universe	EPIPHANY	\N	\N	\N
404	Drum & Sax Performance	Instrumental	\N	\N	\N
195	6つの風	LAST	\N	\N	\N
204	勝者臆病者	LIFE 6 SENSE	\N	\N	\N
394	Between Us	Unreleased	\N	\N	\N
227	ENOUGH-1	Ø CHOIR	\N	\N	\N
228	KICKが自由	Ø CHOIR	\N	\N	\N
229	別世界	Ø CHOIR	\N	\N	\N
230	Born Slippy	Ø CHOIR	\N	\N	\N
320	Born Slippy .NUXX	Ø CHOIR	\N	\N	\N
231	在るべき形	Ø CHOIR	\N	\N	\N
232	0 choir	Ø CHOIR	\N	\N	\N
405	Arigatou	Unreleased	\N	\N	\N
277	零 HERE ～SE～	Ø CHOIR	\N	\N	\N
226	誰が言った	Ø CHOIR	\N	\N	\N
225	TA-LI	Single	\N	\N	\N
122	ODD FUTURE	UNSER	\N	\N	\N
244	PLOT	UNSER	\N	\N	\N
241	Collide	TYCOON	\N	\N	\N
240	終焉	TYCOON	\N	\N	\N
315	EVER	EPIPHANY	\N	\N	\N
237	IDEAL REALITY	TYCOON	\N	\N	\N
238	LONE WOLF	TYCOON	\N	\N	\N
243	ほんの少し	TYCOON	\N	\N	\N
395	Ditto	Unreleased	\N	\N	\N
233	エミュー	TYCOON	\N	\N	\N
285	Ø CHOIR	Ø CHOIR	\N	\N	\N
239	奏全域	TYCOON	\N	\N	\N
236	SHOUT LOVE	TYCOON	\N	\N	\N
306	GROOVY GROOVY GROOVY	PROGLUTION	\N	\N	\N
390	DON!DON!TAKESHI	Others	\N	\N	\N
246	ConneQt	UNSER	\N	\N	\N
247	境界	UNSER	\N	\N	\N
248	stay on	UNSER	\N	\N	\N
249	First Sight	UNSER	\N	\N	\N
250	無意味になる夜	UNSER	\N	\N	\N
251	OXYMORON	UNSER	\N	\N	\N
252	UNSER	UNSER	\N	\N	\N
242	TYCOON	TYCOON	\N	\N	\N
309	NO MAP	EPIPHANY	\N	\N	\N
264	NEVER ENDING WORLD	30	\N	\N	\N
255	Teenage Love	30	\N	\N	\N
256	LIVIN' IT UP	30	\N	\N	\N
235	RANGE	TYCOON	\N	\N	\N
259	イーティー	30	\N	\N	\N
257	来鳥江	30	\N	\N	\N
254	HOURGLASS	30	\N	\N	\N
261	えくぼ	30	\N	\N	\N
262	OUR ALWAYS	30	\N	\N	\N
263	THUG LIFE	30	\N	\N	\N
258	SOUL	30	\N	\N	\N
268	FINALIST	ENIGMASIS	\N	\N	\N
304	THE ONE	THE ONE	\N	\N	\N
266	BVCK	30	\N	\N	\N
269	echoOZ	ENIGMASIS	\N	\N	\N
270	Don't Think.Sing	ENIGMASIS	\N	\N	\N
273	two Lies	ENIGMASIS	\N	\N	\N
271	THEORY	ENIGMASIS	\N	\N	\N
260	One stroke for freedom	30	\N	\N	\N
265	ピグマリオン	ENIGMASIS	\N	\N	\N
234	Forever Young	TYCOON	\N	\N	\N
209	THE SONG	THE ONE	\N	\N	\N
314	If...Hello	EPIPHANY	\N	\N	\N
307	=	Single	\N	\N	\N
253	Spreadown	30	\N	\N	\N
245	CORE STREAM	UNSER	\N	\N	\N
319	JUMP	EPIPHANY	\N	\N	\N
333	brand new ancient	EPIPHANY	\N	\N	\N
330	EYEWALL	EPIPHANY	\N	\N	\N
310	ZERO BREAKOUT POINT	EPIPHANY	\N	\N	\N
292	Kirifuda	Single	\N	\N	\N
283	Revolve	Single	\N	\N	\N
279	High Light!	EPIPHANY	\N	\N	\N
276	NOWHERE boy	Single	\N	\N	\N
323	Honpen	EPIPHANY	\N	\N	\N
311	PHOENIX AX	EPIPHANY	\N	\N	\N
211	セオリーとの決別の研究+81	THE ONE	\N	\N	\N
207	バーベル～皇帝の新しい服 album ver.～	THE ONE	\N	\N	\N
189	closed POKER	AwakEVE	\N	\N	\N
174	畢生皐月プロローグ	PROGLUTION	\N	\N	\N
224	PROGLUTION	PROGLUTION	\N	\N	\N
156	モノクローム〜気付けなかったdevotion〜	PROGLUTION	\N	\N	\N
153	Live everyday as if it were the last day	BUGRIGHT	\N	\N	\N
98	just Melody	Timeless	\N	\N	\N
138	Burst	Timeless	\N	\N	\N
99	Colors of the Heart	Timeless	\N	\N	\N
303	GiANT KiLLERS	Single	\N	\N	\N
376	Hon'no Sukoshi	\N	\N	\N	\N
267	ENCORE AGAIN	ENIGMASIS	\N	\N	\N
272	α-Skill	ENIGMASIS	\N	\N	\N
220	7日目の決意	LAST	\N	\N	\N
340	SHINE	Timeless	\N	\N	\N
128	Victosound	Single	\N	\N	\N
342	Countdown	Single	\N	\N	\N
328	PRIME	Single	\N	\N	\N
317	EPIPHANY	EPIPHANY	\N	\N	\N
318	to the world	EPIPHANY	\N	\N	\N
313	Only US	EPIPHANY	\N	\N	\N
308	WICKED boy	EPIPHANY	\N	\N	\N
281	WINGS ever	EPIPHANY	\N	\N	\N
410	Koi no Mega Lover	\N	\N	\N	\N
411	Kiseki	\N	\N	\N	\N
414	Hanamizuki / Sen no Kaze ni Natte	\N	\N	\N	\N
415	Lion Heart / Itsuka no Merry Christmas / LOVE Namidairo / Yeah! Meccha Holiday	\N	\N	\N	\N
416	Hanamizuki / Christmas Eve / Shima Uta / Sen no Kaze ni Natte / Koisuru Fortune Cookie	\N	\N	\N	\N
417	Hanamizuki / Sen no Kaze ni Natte / Christmas Eve / Heavy Rotation	\N	\N	\N	\N
418	Hanamizuki / Sen no Kaze ni Natte /  Koisuru Fortune Cookie	\N	\N	\N	\N
419	LOVIN' YOU / Itsuka no Merry Christmas / LOVE Namidairo / Yeah! Meccha Holiday	\N	\N	\N	\N
327	言わなくても伝わる あれは少し嘘だ	EPIPHANY	\N	\N	\N
401	Pretender	Covers	\N	\N	\N
413	Dragon Night	Covers	\N	\N	\N
381	ROSIER	Covers	\N	\N	\N
400	Shukumei	Covers	\N	\N	\N
399	Monochrome ~Kidukenakatta devotion~	Unreleased	\N	\N	\N
383	ONIGIRI	Others	\N	\N	\N
421	徒労	Others	2022	\N	UVERworld
384	Counting Song-H	PROGLUTION	\N	\N	\N
422	Home ～微熱39℃～	BUGRIGHT	\N	\N	\N
131	MEMORIES of the End	EPIPHANY	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, role, created_at, is_verified, verification_token, reset_password_token, reset_password_expires) FROM stdin;
27	haya-ryoo	oaulth@gmail.com	$2b$10$cvwZ6LUNTV8eiNDoLbA1juol06EWp1N..SYKc1zHsv51zqsVqW4F6	admin	2026-01-24 07:18:23.749263	t	\N	\N	\N
\.


--
-- Name: corrections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.corrections_id_seq', 7, true);


--
-- Name: lives_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lives_id_seq', 1197, true);


--
-- Name: security_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.security_logs_id_seq', 16, true);


--
-- Name: setlists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.setlists_id_seq', 17793, true);


--
-- Name: songs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.songs_id_seq', 422, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 27, true);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (user_id, live_id);


--
-- Name: corrections corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corrections
    ADD CONSTRAINT corrections_pkey PRIMARY KEY (id);


--
-- Name: lives lives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lives
    ADD CONSTRAINT lives_pkey PRIMARY KEY (id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: setlists setlists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setlists
    ADD CONSTRAINT setlists_pkey PRIMARY KEY (id);


--
-- Name: songs songs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.songs
    ADD CONSTRAINT songs_pkey PRIMARY KEY (id);


--
-- Name: songs songs_title_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.songs
    ADD CONSTRAINT songs_title_key UNIQUE (title);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_corrections_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_corrections_created_at ON public.corrections USING btree (created_at);


--
-- Name: idx_corrections_live_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_corrections_live_id ON public.corrections USING btree (live_id);


--
-- Name: idx_corrections_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_corrections_status ON public.corrections USING btree (status);


--
-- Name: idx_corrections_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_corrections_user_id ON public.corrections USING btree (user_id);


--
-- Name: idx_security_logs_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_logs_event_type ON public.security_logs USING btree (event_type);


--
-- Name: idx_security_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_logs_timestamp ON public.security_logs USING btree ("timestamp" DESC);


--
-- Name: songs_title_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX songs_title_idx ON public.songs USING btree (title);


--
-- Name: attendance attendance_live_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.lives(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: corrections corrections_live_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corrections
    ADD CONSTRAINT corrections_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.lives(id);


--
-- Name: corrections corrections_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corrections
    ADD CONSTRAINT corrections_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: corrections corrections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corrections
    ADD CONSTRAINT corrections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: setlists setlists_live_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setlists
    ADD CONSTRAINT setlists_live_id_fkey FOREIGN KEY (live_id) REFERENCES public.lives(id) ON DELETE CASCADE;


--
-- Name: setlists setlists_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setlists
    ADD CONSTRAINT setlists_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ZpoM4e5r5MC8UNuc0a5eEefOtYlviXqhF1Ao37pwPWjf3yWK9b1jmMUZgLRrbBZ

