--
-- PostgreSQL database dump
--

\restrict yA7KJFMBxtb3pFIO1V2NfdhPje75IWta0yJjrL7HqTcGwbxIWFfCROqIhHhcCnT

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: backup_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backup_products (
    id character varying(50),
    tenant_id character varying(50),
    name character varying(255),
    barcode character varying(100),
    category character varying(100),
    price numeric(15,2),
    cost numeric(15,2),
    stock integer,
    min_stock integer,
    unit character varying(20),
    image_url text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.backup_products OWNER TO postgres;

--
-- Name: backup_stock_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backup_stock_logs (
    id character varying(50),
    tenant_id character varying(50),
    product_id character varying(50),
    "timestamp" timestamp with time zone,
    type character varying(20),
    quantity integer,
    reason text,
    current_stock integer,
    operator character varying(100)
);


ALTER TABLE public.backup_stock_logs OWNER TO postgres;

--
-- Name: cashier_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cashier_sessions (
    id character varying(50) NOT NULL,
    tenant_id character varying(50),
    cashier_uid character varying(100) NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    opening_balance numeric(15,2) DEFAULT 0 NOT NULL,
    closing_balance numeric(15,2),
    total_cash_sales numeric(15,2) DEFAULT 0,
    total_qris numeric(15,2) DEFAULT 0,
    total_card numeric(15,2) DEFAULT 0,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cashier_sessions OWNER TO postgres;

--
-- Name: kas_besar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kas_besar (
    tenant_id character varying(50) NOT NULL,
    balance numeric(15,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.kas_besar OWNER TO postgres;

--
-- Name: kas_mutations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kas_mutations (
    id character varying(50) NOT NULL,
    tenant_id character varying(50),
    type character varying(20) NOT NULL,
    source character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    note text,
    session_id character varying(50),
    target character varying(20) NOT NULL
);


ALTER TABLE public.kas_mutations OWNER TO postgres;

--
-- Name: login_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_logs (
    id integer NOT NULL,
    tenant_id character varying(50),
    ip_address character varying(45),
    user_agent text,
    status character varying(20) NOT NULL,
    reason text,
    attempted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.login_logs OWNER TO postgres;

--
-- Name: login_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.login_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_logs_id_seq OWNER TO postgres;

--
-- Name: login_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.login_logs_id_seq OWNED BY public.login_logs.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id character varying(50) NOT NULL,
    tenant_id character varying(50),
    name character varying(255) NOT NULL,
    barcode character varying(100),
    category character varying(100),
    price numeric(15,2) DEFAULT 0 NOT NULL,
    cost numeric(15,2) DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    min_stock integer DEFAULT 5,
    unit character varying(20) DEFAULT 'pcs'::character varying,
    image_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: stock_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_logs (
    id character varying(50) NOT NULL,
    tenant_id character varying(50),
    product_id character varying(50),
    "timestamp" timestamp with time zone NOT NULL,
    type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    reason text,
    current_stock integer NOT NULL,
    operator character varying(100)
);


ALTER TABLE public.stock_logs OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    owner_email character varying(255) NOT NULL,
    admin_pin character varying(10) NOT NULL,
    address text,
    phone character varying(20),
    categories jsonb DEFAULT '[]'::jsonb,
    receipt_footer text,
    receipt_logo text,
    printer_address character varying(100),
    printer_auto_cut boolean DEFAULT false,
    qris_merchant_name character varying(255),
    qris_nmid character varying(50),
    qris_custom_image text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    cashiers jsonb DEFAULT '[]'::jsonb,
    subscription_status character varying(20) DEFAULT 'trial'::character varying,
    subscription_package character varying(20) DEFAULT 'monthly'::character varying,
    trial_ends_at timestamp with time zone,
    subscription_ends_at timestamp with time zone,
    tax_enabled boolean DEFAULT false,
    tax_percentage numeric(5,2) DEFAULT 11.00,
    tax_method character varying(20) DEFAULT 'exclude'::character varying
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: transaction_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_items (
    id integer NOT NULL,
    transaction_id character varying(50),
    product_id character varying(50),
    name character varying(255) NOT NULL,
    price numeric(15,2) NOT NULL,
    cost numeric(15,2) NOT NULL,
    quantity integer NOT NULL
);


ALTER TABLE public.transaction_items OWNER TO postgres;

--
-- Name: transaction_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transaction_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_items_id_seq OWNER TO postgres;

--
-- Name: transaction_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transaction_items_id_seq OWNED BY public.transaction_items.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id character varying(50) NOT NULL,
    tenant_id character varying(50),
    "timestamp" timestamp with time zone NOT NULL,
    total_price numeric(15,2) NOT NULL,
    total_cost numeric(15,2) NOT NULL,
    profit numeric(15,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    amount_paid numeric(15,2) NOT NULL,
    change numeric(15,2) NOT NULL,
    cashier_name character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    session_id character varying(50),
    tax numeric(15,2) DEFAULT 0,
    discount numeric(15,2) DEFAULT 0,
    tax_percent numeric(5,2) DEFAULT 0,
    discount_percent numeric(5,2) DEFAULT 0
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: login_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_logs ALTER COLUMN id SET DEFAULT nextval('public.login_logs_id_seq'::regclass);


--
-- Name: transaction_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_items ALTER COLUMN id SET DEFAULT nextval('public.transaction_items_id_seq'::regclass);


--
-- Data for Name: backup_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.backup_products (id, tenant_id, name, barcode, category, price, cost, stock, min_stock, unit, image_url, created_at, updated_at) FROM stdin;
prod-i1qw0fr	TOKO-L1GLT	Es Teh	8991232325192	Minuman	4000.00	3000.00	8	3	\N	☕	2026-05-31 20:22:24.536152+07	2026-05-31 20:22:24.536152+07
prod-a1a8xpo	TOKO-L1GLT	Kopi Susu	8991232951536	Makanan	7000.00	4000.00	8	3	\N	☕	2026-05-31 20:23:10.860374+07	2026-05-31 20:23:10.860374+07
prod-njte9zw	TOKO-L1GLT	Mie Ayam	8991234530797	Makanan	11000.00	8000.00	8	3	\N	🍜	2026-05-31 20:23:33.950778+07	2026-05-31 20:23:33.950778+07
prod-jb4yifz	TOKO-L1GLT	Nasi Goreng	8991237257505	Makanan	13000.00	10000.00	9	3	\N	🍜	2026-05-31 20:21:25.129541+07	2026-05-31 20:21:25.129541+07
\.


--
-- Data for Name: backup_stock_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.backup_stock_logs (id, tenant_id, product_id, "timestamp", type, quantity, reason, current_stock, operator) FROM stdin;
log-r8le5ht	TOKO-L1GLT	prod-jb4yifz	2026-05-31 20:21:25.145+07	in	10	PENAMBAHAN	0	susiono.ahmad@gmail.com
log-9434m5b	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 20:22:24.546+07	in	10	PENAMBAHAN	0	susiono.ahmad@gmail.com
log-qkc52sl	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 20:23:10.87+07	in	10	PENAMBAHAN	0	susiono.ahmad@gmail.com
log-v0efzrs	TOKO-L1GLT	prod-njte9zw	2026-05-31 20:23:33.964+07	in	10	PENAMBAHAN	0	susiono.ahmad@gmail.com
log-xt0z9od	TOKO-L1GLT	prod-njte9zw	2026-05-31 20:34:22.501+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-mdhf6vz	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 20:34:22.527+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-iub6s0v	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 20:34:22.507+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-1780236062576-prod-i1qw0fr	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 21:01:02.507+07	out	1	Penjualan nota-gf2nj4w	9	NESSA
log-1780236062582-prod-a1a8xpo	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 21:01:02.507+07	out	1	Penjualan nota-gf2nj4w	9	NESSA
log-1780236062583-prod-njte9zw	TOKO-L1GLT	prod-njte9zw	2026-05-31 21:01:02.507+07	out	1	Penjualan nota-gf2nj4w	9	NESSA
log-zi0yfp4	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 21:01:03.132+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-crjmfz5	TOKO-L1GLT	prod-njte9zw	2026-05-31 21:01:03.145+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-z4821un	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 21:01:03.137+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-26rpsuq	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 21:01:03.237+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-4fu2q8t	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 21:01:03.273+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-gb0eiue	TOKO-L1GLT	prod-njte9zw	2026-05-31 21:01:03.281+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-1780240118174-prod-i1qw0fr	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 22:08:38.106+07	out	1	Penjualan nota-dirqc9e	8	NESSA
log-1780240118179-prod-a1a8xpo	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 22:08:38.106+07	out	1	Penjualan nota-dirqc9e	8	NESSA
log-1780240118181-prod-njte9zw	TOKO-L1GLT	prod-njte9zw	2026-05-31 22:08:38.106+07	out	1	Penjualan nota-dirqc9e	8	NESSA
log-1780240118183-prod-jb4yifz	TOKO-L1GLT	prod-jb4yifz	2026-05-31 22:08:38.106+07	out	1	Penjualan nota-dirqc9e	9	NESSA
log-hnyo0fp	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 22:08:38.549+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-j8rqnl7	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 22:08:39.164+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-7e2wht3	TOKO-L1GLT	prod-njte9zw	2026-05-31 22:08:39.174+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-pity9wp	TOKO-L1GLT	prod-jb4yifz	2026-05-31 22:08:39.181+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-ihci5mb	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 22:08:39.225+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-joi8oxw	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 22:08:39.231+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-613dayy	TOKO-L1GLT	prod-njte9zw	2026-05-31 22:08:39.278+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
log-by5cb7v	TOKO-L1GLT	prod-jb4yifz	2026-05-31 22:08:39.296+07	out	1	PENJUALAN	0	susiono.ahmad@gmail.com
\.


--
-- Data for Name: cashier_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cashier_sessions (id, tenant_id, cashier_uid, start_time, end_time, opening_balance, closing_balance, total_cash_sales, total_qris, total_card, status, created_at) FROM stdin;
session-kb708ly	TOKO-KTPGB	1780292896649	2026-06-02 13:23:47.621+07	\N	400000.00	\N	0.00	0.00	0.00	OPEN	2026-06-02 13:23:47.629538+07
\.


--
-- Data for Name: kas_besar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kas_besar (tenant_id, balance, updated_at) FROM stdin;
TOKO-DEMO	10000000.00	2026-05-31 20:50:03.050017+07
TOKO-L1GLT	2938850.00	2026-05-31 23:14:49.44223+07
TOKO-TEST-REG	0.00	2026-06-01 11:02:37.078322+07
TOKO-KTPGB	2638640.00	2026-06-02 13:23:47.608755+07
\.


--
-- Data for Name: kas_mutations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kas_mutations (id, tenant_id, type, source, amount, "timestamp", note, session_id, target) FROM stdin;
mut-mitrkly	TOKO-L1GLT	KELUAR	MODAL_SESI	500000.00	2026-05-31 21:00:50.401+07	Transfer modal ke Kasir	\N	KAS_BESAR
mut-4tfx62d	TOKO-L1GLT	MASUK	PENARIKAN_SESI	500000.00	2026-05-31 21:15:21.422+07	Penarikan dari Kasir ke Kas Besar (Sesi: session-ipc6uhh)	\N	KAS_BESAR
mut-initial-TOKO-L1GLT	TOKO-L1GLT	MASUK	SALDO_AWAL	3000000.00	2026-05-31 20:20:36.922+07	Saldo Awal Kas Besar	\N	KAS_BESAR
mut-ujuzbzv	TOKO-L1GLT	MASUK	PENARIKAN_SESI	68850.00	2026-05-31 22:09:10.362+07	Penarikan dari Kasir ke Kas Besar (Sesi: session-a9exedt)	\N	KAS_BESAR
mut-6mx8bsd	TOKO-L1GLT	KELUAR	MODAL_SESI	100000.00	2026-05-31 23:14:48.949+07	Transfer modal ke Kasir	\N	KAS_BESAR
mut-9xqlhao	TOKO-KTPGB	MASUK	LAINNYA	3000000.00	2026-06-01 13:18:13.725+07	Setor Kas Besar	\N	KAS_BESAR
mut-givwdhl	TOKO-KTPGB	KELUAR	MODAL_SESI	30000.00	2026-06-01 13:19:38.66+07	Transfer modal ke Kasir	\N	KAS_BESAR
mut-ursbdqr	TOKO-KTPGB	MASUK	PENARIKAN_SESI	68640.00	2026-06-01 20:47:58.42+07	Penarikan dari Kasir ke Kas Besar (Sesi: session-dhmq0ya)	\N	KAS_BESAR
mut-mid3x3z	TOKO-KTPGB	KELUAR	MODAL_SESI	400000.00	2026-06-02 13:23:47.512+07	Transfer modal ke Kasir	\N	KAS_BESAR
\.


--
-- Data for Name: login_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.login_logs (id, tenant_id, ip_address, user_agent, status, reason, attempted_at) FROM stdin;
1	TOKO-L1GLT	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	SUCCESS	Login sebagai owner	2026-06-01 21:12:30.491355+07
2	TOKO-KTPGB	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	SUCCESS	Login sebagai owner	2026-06-01 21:12:41.309735+07
3	TOKO-KTPGB	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	FAILED	PIN Salah	2026-06-01 21:13:05.147751+07
4	TOKO-KTPGB	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	SUCCESS	Login sebagai owner	2026-06-01 21:13:57.240391+07
5	TOKO-L1GLT	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0	SUCCESS	Login sebagai owner	2026-06-02 00:22:35.924246+07
6	TOKO-KTPGB	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	SUCCESS	Login sebagai owner	2026-06-02 13:23:03.615609+07
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, tenant_id, name, barcode, category, price, cost, stock, min_stock, unit, image_url, created_at, updated_at) FROM stdin;
prod-njte9zw	TOKO-L1GLT	Mie Ayam	8991234530797	Makanan	11000.00	8000.00	8	3	\N	🍜	2026-05-31 20:23:33.950778+07	2026-05-31 20:23:33.950778+07
prod-jb4yifz	TOKO-L1GLT	Nasi Goreng	8991237257505	Makanan	13000.00	10000.00	9	3	\N	🍜	2026-05-31 20:21:25.129541+07	2026-05-31 20:21:25.129541+07
prod-i1qw0fr	TOKO-L1GLT	Es Teh	8991232325192	Minuman	4000.00	3000.00	6	3	\N	☕	2026-05-31 20:22:24.536152+07	2026-05-31 20:22:24.536152+07
prod-a1a8xpo	TOKO-L1GLT	Kopi Susu	8991232951536	Makanan	7000.00	4000.00	5	3	\N	☕	2026-05-31 20:23:10.860374+07	2026-05-31 20:23:10.860374+07
prod-p87r0b7	TOKO-KTPGB	Es Teh	8991234676656	Makanan	4000.00	3000.00	9	3	\N	☕	2026-06-01 21:14:30.495692+07	2026-06-01 21:14:30.495692+07
prod-fe1h8gt	TOKO-KTPGB	Nasi Goreng	8991236515841	Makanan	12000.00	10000.00	11	3	\N	📦	2026-06-01 12:49:28.044879+07	2026-06-01 13:19:49.032318+07
\.


--
-- Data for Name: stock_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_logs (id, tenant_id, product_id, "timestamp", type, quantity, reason, current_stock, operator) FROM stdin;
log-ihci5mb	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 22:08:39.225+07	out	1	PENJUALAN	8	susiono.ahmad@gmail.com
log-hnyo0fp	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 22:08:38.549+07	out	1	PENJUALAN	9	susiono.ahmad@gmail.com
log-1780240118174-prod-i1qw0fr	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 22:08:38.106+07	out	1	Penjualan nota-dirqc9e	10	NESSA
log-26rpsuq	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 21:01:03.237+07	out	1	PENJUALAN	11	susiono.ahmad@gmail.com
log-zi0yfp4	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 21:01:03.132+07	out	1	PENJUALAN	12	susiono.ahmad@gmail.com
log-1780236062576-prod-i1qw0fr	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 21:01:02.507+07	out	1	Penjualan nota-gf2nj4w	13	NESSA
log-mdhf6vz	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 20:34:22.527+07	out	1	PENJUALAN	14	susiono.ahmad@gmail.com
log-9434m5b	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 20:22:24.546+07	in	10	PENAMBAHAN	15	susiono.ahmad@gmail.com
log-joi8oxw	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 22:08:39.231+07	out	1	PENJUALAN	8	susiono.ahmad@gmail.com
log-j8rqnl7	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 22:08:39.164+07	out	1	PENJUALAN	9	susiono.ahmad@gmail.com
log-1780240118179-prod-a1a8xpo	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 22:08:38.106+07	out	1	Penjualan nota-dirqc9e	10	NESSA
log-4fu2q8t	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 21:01:03.273+07	out	1	PENJUALAN	11	susiono.ahmad@gmail.com
log-z4821un	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 21:01:03.137+07	out	1	PENJUALAN	12	susiono.ahmad@gmail.com
log-1780236062582-prod-a1a8xpo	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 21:01:02.507+07	out	1	Penjualan nota-gf2nj4w	13	NESSA
log-iub6s0v	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 20:34:22.507+07	out	1	PENJUALAN	14	susiono.ahmad@gmail.com
log-qkc52sl	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 20:23:10.87+07	in	10	PENAMBAHAN	15	susiono.ahmad@gmail.com
log-613dayy	TOKO-L1GLT	prod-njte9zw	2026-05-31 22:08:39.278+07	out	1	PENJUALAN	8	susiono.ahmad@gmail.com
log-7e2wht3	TOKO-L1GLT	prod-njte9zw	2026-05-31 22:08:39.174+07	out	1	PENJUALAN	9	susiono.ahmad@gmail.com
log-1780240118181-prod-njte9zw	TOKO-L1GLT	prod-njte9zw	2026-05-31 22:08:38.106+07	out	1	Penjualan nota-dirqc9e	10	NESSA
log-gb0eiue	TOKO-L1GLT	prod-njte9zw	2026-05-31 21:01:03.281+07	out	1	PENJUALAN	11	susiono.ahmad@gmail.com
log-crjmfz5	TOKO-L1GLT	prod-njte9zw	2026-05-31 21:01:03.145+07	out	1	PENJUALAN	12	susiono.ahmad@gmail.com
log-1780236062583-prod-njte9zw	TOKO-L1GLT	prod-njte9zw	2026-05-31 21:01:02.507+07	out	1	Penjualan nota-gf2nj4w	13	NESSA
log-xt0z9od	TOKO-L1GLT	prod-njte9zw	2026-05-31 20:34:22.501+07	out	1	PENJUALAN	14	susiono.ahmad@gmail.com
log-v0efzrs	TOKO-L1GLT	prod-njte9zw	2026-05-31 20:23:33.964+07	in	10	PENAMBAHAN	15	susiono.ahmad@gmail.com
log-by5cb7v	TOKO-L1GLT	prod-jb4yifz	2026-05-31 22:08:39.296+07	out	1	PENJUALAN	9	susiono.ahmad@gmail.com
log-pity9wp	TOKO-L1GLT	prod-jb4yifz	2026-05-31 22:08:39.181+07	out	1	PENJUALAN	10	susiono.ahmad@gmail.com
log-1780240118183-prod-jb4yifz	TOKO-L1GLT	prod-jb4yifz	2026-05-31 22:08:38.106+07	out	1	Penjualan nota-dirqc9e	11	NESSA
log-r8le5ht	TOKO-L1GLT	prod-jb4yifz	2026-05-31 20:21:25.145+07	in	10	PENAMBAHAN	12	susiono.ahmad@gmail.com
log-nota-lrogtw1-prod-i1qw0fr	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 23:15:04.32+07	out	1	Penjualan nota-lrogtw1	7	susi
log-nota-lrogtw1-prod-a1a8xpo	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 23:15:04.32+07	out	1	Penjualan nota-lrogtw1	7	susi
log-lbc43zk	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 23:15:04.647+07	out	1	PENJUALAN	7	susiono.ahmad@gmail.com
log-130ny9f	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 23:15:04.746+07	out	1	PENJUALAN	7	susiono.ahmad@gmail.com
log-eyh14de	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 23:15:04.782+07	out	1	PENJUALAN	7	susiono.ahmad@gmail.com
log-x5nk3qn	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 23:15:04.822+07	out	1	PENJUALAN	7	susiono.ahmad@gmail.com
log-nota-4upoi5i-prod-a1a8xpo	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 23:16:52.72+07	out	1	Penjualan nota-4upoi5i	6	susi
log-dvveyyy	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 23:16:53.171+07	out	1	PENJUALAN	6	susiono.ahmad@gmail.com
log-34fx8cq	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 23:16:53.262+07	out	1	PENJUALAN	6	susiono.ahmad@gmail.com
log-nota-coxky0w-prod-i1qw0fr	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 23:56:41.917+07	out	1	Penjualan nota-coxky0w	6	susi
log-nota-coxky0w-prod-a1a8xpo	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 23:56:41.917+07	out	1	Penjualan nota-coxky0w	5	susi
log-xy1zerd	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 23:56:42.515+07	out	1	PENJUALAN	6	susiono.ahmad@gmail.com
log-f0wr6ut	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 23:56:42.566+07	out	1	PENJUALAN	5	susiono.ahmad@gmail.com
log-keyq8ji	TOKO-L1GLT	prod-i1qw0fr	2026-05-31 23:56:42.631+07	out	1	PENJUALAN	6	susiono.ahmad@gmail.com
log-mg0yss9	TOKO-L1GLT	prod-a1a8xpo	2026-05-31 23:56:42.679+07	out	1	PENJUALAN	5	susiono.ahmad@gmail.com
log-d11f5en	TOKO-KTPGB	prod-fe1h8gt	2026-06-01 12:49:28.054+07	in	10	PENAMBAHAN	10	ahmad.coding83@gmail.com
log-dy6kvv5	TOKO-KTPGB	prod-fe1h8gt	2026-06-01 12:59:21.44+07	in	5	PENAMBAHAN	10	ahmad.coding83@gmail.com
log-2cfa5fi	TOKO-KTPGB	prod-fe1h8gt	2026-06-01 12:59:38.317+07	in	5	PENAMBAHAN	10	ahmad.coding83@gmail.com
log-prm4s2r	TOKO-KTPGB	prod-fe1h8gt	2026-06-01 13:01:46.61+07	in	5	PENAMBAHAN	15	ahmad.coding83@gmail.com
log-5xe31cg	TOKO-KTPGB	prod-fe1h8gt	2026-06-01 13:19:49.001+07	out	1	PENJUALAN	14	ahmad.coding83@gmail.com
log-nota-4gysy4v-prod-fe1h8gt	TOKO-KTPGB	prod-fe1h8gt	2026-06-01 13:19:48.941+07	out	1	Penjualan nota-4gysy4v	14	nessa
log-vsqi8zw	TOKO-KTPGB	prod-fe1h8gt	2026-06-01 13:19:49.044+07	out	1	PENJUALAN	14	ahmad.coding83@gmail.com
log-nota-7ezo8i7-prod-fe1h8gt	TOKO-KTPGB	prod-fe1h8gt	2026-06-01 16:45:19.652+07	out	1	Penjualan nota-7ezo8i7	13	Kasir 1
log-nota-9qw4a0n-prod-fe1h8gt	TOKO-KTPGB	prod-fe1h8gt	2026-06-01 19:47:15.524+07	out	1	Penjualan nota-9qw4a0n	12	Kasir 1
log-2h4ddmv	TOKO-KTPGB	prod-p87r0b7	2026-06-01 21:14:30.504+07	in	10	PENAMBAHAN	10	ahmad.coding83@gmail.com
log-nota-nbwsdn3-prod-p87r0b7	TOKO-KTPGB	prod-p87r0b7	2026-06-02 13:24:02.187+07	out	1	PENJUALAN	9	Kasir 1
log-nota-nbwsdn3-prod-fe1h8gt	TOKO-KTPGB	prod-fe1h8gt	2026-06-02 13:24:02.187+07	out	1	PENJUALAN	11	Kasir 1
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, name, owner_email, admin_pin, address, phone, categories, receipt_footer, receipt_logo, printer_address, printer_auto_cut, qris_merchant_name, qris_nmid, qris_custom_image, created_at, updated_at, cashiers, subscription_status, subscription_package, trial_ends_at, subscription_ends_at, tax_enabled, tax_percentage, tax_method) FROM stdin;
TOKO-TEST-REG	Toko Uji Registrasi Baru	testowner@pos.com	5678	\N	\N	["Makanan", "Minuman"]	\N	\N	\N	f	\N	\N	\N	2026-05-31 20:18:28.798157+07	2026-05-31 20:18:28.798157+07	[{"pin": "9999", "uid": "cashier-1", "name": "Budi Kasir", "tenantId": "TOKO-TEST-REG"}]	trial	monthly	\N	\N	f	11.00	exclude
TOKO-DEMO	Warung Kasir Pintar (Demo Lokal)	offline_owner@pos.com	1234	\N	\N	["Makanan", "Minuman", "Sembako", "Sabun & Mandi", "Lainnya"]	\N	\N	\N	f	\N	\N	\N	2026-05-31 20:04:59.292163+07	2026-06-02 13:42:00.232898+07	[{"pin": "0000", "uid": "demo-cashier", "name": "Kasir Demo", "tenantId": "TOKO-DEMO"}]	trial	monthly	2026-06-09 13:42:00.224+07	\N	f	11.00	exclude
TOKO-L1GLT	TOKO-AHMAD	susiono.ahmad@gmail.com	1234	Jl Sumbodro 32 Tegal	091919199191	["Makanan", "Minuman", "Sembako"]	Terima kasih atas kunjungan Anda!\nBarang yang dibeli tidak dapat ditukar.	data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9IjEwMCIgZmlsbD0iIzRmNDZlNSIvPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNMzc2IDE5NXYxNTZhMjQgMjQgMCAwIDEtMjQgMjRIMTYwYTI0IDI0IDAgMCAxLTI0LTI0VjE5NWEyNCAyNCAwIDAgMSAyNC0yNGgxOTJhMjQgMjQgMCAwIDEgMjQgMjR6Ii8+PHBhdGggZmlsbD0iI2UwZTdmZiIgZD0iTTEyOCAxNzFsMTI4LTY0IDEyOCA2NHYzMkgxMjh6Ii8+PC9zdmc+Cg==		f	TOKO-AHMAD		data:image/png;base64,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	2026-05-31 20:20:36.922467+07	2026-06-01 10:58:54.886775+07	[{"pin": "0000", "uid": "1780233636831", "name": "NESSA", "tenantId": "TOKO-L1GLT"}, {"pin": "1111", "uid": "1780244012737", "name": "susi", "tenantId": "TOKO-L1GLT"}]	active	monthly	\N	2027-06-01 10:46:53.872+07	f	11.00	exclude
TOKO-KTPGB	TOKO KODING	ahmad.coding83@gmail.com	1234			["Makanan", "Minuman", "Sembako", "Sabun & Mandi", "Lainnya"]	Terima kasih atas kunjungan Anda!\nBarang yang dibeli tidak dapat ditukar.			f	TOKO KODING			2026-06-01 12:48:16.711152+07	2026-06-01 19:46:29.210266+07	[{"pin": "0000", "uid": "1780292896649", "name": "Kasir 1", "tenantId": "TOKO-KTPGB"}, {"pin": "1111", "uid": "1780294730591", "name": "nessa", "tenantId": "TOKO-KTPGB"}]	trial	trial	2026-06-08 12:48:16.649+07	\N	t	11.00	include
\.


--
-- Data for Name: transaction_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_items (id, transaction_id, product_id, name, price, cost, quantity) FROM stdin;
2	nota-gf2nj4w	prod-i1qw0fr	Es Teh	4000.00	3000.00	1
3	nota-gf2nj4w	prod-a1a8xpo	Kopi Susu	7000.00	4000.00	1
4	nota-gf2nj4w	prod-njte9zw	Mie Ayam	11000.00	8000.00	1
5	nota-dirqc9e	prod-i1qw0fr	Es Teh	4000.00	3000.00	1
6	nota-dirqc9e	prod-a1a8xpo	Kopi Susu	7000.00	4000.00	1
7	nota-dirqc9e	prod-njte9zw	Mie Ayam	11000.00	8000.00	1
8	nota-dirqc9e	prod-jb4yifz	Nasi Goreng	13000.00	10000.00	1
9	nota-lrogtw1	prod-i1qw0fr	Es Teh	4000.00	3000.00	1
10	nota-lrogtw1	prod-a1a8xpo	Kopi Susu	7000.00	4000.00	1
11	nota-4upoi5i	prod-a1a8xpo	Kopi Susu	7000.00	4000.00	1
12	nota-coxky0w	prod-i1qw0fr	Es Teh	4000.00	3000.00	1
13	nota-coxky0w	prod-a1a8xpo	Kopi Susu	7000.00	4000.00	1
14	nota-4gysy4v	prod-fe1h8gt	Nasi Goreng	12000.00	10000.00	1
15	nota-7ezo8i7	prod-fe1h8gt	Nasi Goreng	12000.00	10000.00	1
16	nota-9qw4a0n	prod-fe1h8gt	Nasi Goreng	12000.00	10000.00	1
17	nota-nbwsdn3	prod-p87r0b7	Es Teh	4000.00	3000.00	1
18	nota-nbwsdn3	prod-fe1h8gt	Nasi Goreng	12000.00	10000.00	1
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, tenant_id, "timestamp", total_price, total_cost, profit, payment_method, amount_paid, change, cashier_name, created_at, session_id, tax, discount, tax_percent, discount_percent) FROM stdin;
nota-gf2nj4w	TOKO-L1GLT	2026-05-31 21:01:02.507+07	22000.00	15000.00	7000.00	Tunai	22000.00	0.00	NESSA	2026-05-31 21:01:02.56561+07	\N	0.00	0.00	0.00	0.00
nota-dirqc9e	TOKO-L1GLT	2026-05-31 22:08:38.106+07	38850.00	25000.00	13850.00	Tunai	38850.00	0.00	NESSA	2026-05-31 22:08:38.161782+07	session-a9exedt	0.00	0.00	0.00	0.00
nota-lrogtw1	TOKO-L1GLT	2026-05-31 23:15:04.32+07	12210.00	7000.00	5210.00	Tunai	12210.00	0.00	susi	2026-05-31 23:15:04.378951+07	session-c418dl3	0.00	0.00	0.00	0.00
nota-4upoi5i	TOKO-L1GLT	2026-05-31 23:16:52.72+07	7770.00	4000.00	3770.00	QRIS	7770.00	0.00	susi	2026-05-31 23:16:52.899666+07	session-c418dl3	0.00	0.00	0.00	0.00
nota-coxky0w	TOKO-L1GLT	2026-05-31 23:56:41.917+07	11000.00	7000.00	4000.00	Tunai	11000.00	0.00	susi	2026-05-31 23:56:42.023894+07	session-c418dl3	0.00	0.00	0.00	0.00
nota-4gysy4v	TOKO-KTPGB	2026-06-01 13:19:48.941+07	13320.00	10000.00	3320.00	Tunai	13320.00	0.00	nessa	2026-06-01 13:19:48.989939+07	session-dhmq0ya	0.00	0.00	0.00	0.00
nota-7ezo8i7	TOKO-KTPGB	2026-06-01 16:45:19.652+07	13320.00	10000.00	3320.00	Tunai	13320.00	0.00	Kasir 1	2026-06-01 16:45:19.970523+07	session-dhmq0ya	1320.00	0.00	0.00	0.00
nota-9qw4a0n	TOKO-KTPGB	2026-06-01 19:47:15.524+07	12000.00	10000.00	2000.00	Tunai	12000.00	0.00	Kasir 1	2026-06-01 19:47:15.583917+07	session-dhmq0ya	1189.00	0.00	11.00	0.00
nota-nbwsdn3	TOKO-KTPGB	2026-06-02 13:24:02.187+07	15200.00	13000.00	2200.00	Tunai	15200.00	0.00	Kasir 1	2026-06-02 13:24:02.356022+07	session-kb708ly	1506.00	0.00	11.00	5.00
\.


--
-- Name: login_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.login_logs_id_seq', 6, true);


--
-- Name: transaction_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_items_id_seq', 18, true);


--
-- Name: cashier_sessions cashier_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashier_sessions
    ADD CONSTRAINT cashier_sessions_pkey PRIMARY KEY (id);


--
-- Name: kas_besar kas_besar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kas_besar
    ADD CONSTRAINT kas_besar_pkey PRIMARY KEY (tenant_id);


--
-- Name: kas_mutations kas_mutations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kas_mutations
    ADD CONSTRAINT kas_mutations_pkey PRIMARY KEY (id);


--
-- Name: login_logs login_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_logs
    ADD CONSTRAINT login_logs_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: stock_logs stock_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_logs
    ADD CONSTRAINT stock_logs_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: transaction_items transaction_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT transaction_items_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: idx_products_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_tenant ON public.products USING btree (tenant_id);


--
-- Name: idx_stock_logs_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_logs_product ON public.stock_logs USING btree (product_id);


--
-- Name: idx_transactions_tenant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_tenant ON public.transactions USING btree (tenant_id);


--
-- Name: cashier_sessions cashier_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashier_sessions
    ADD CONSTRAINT cashier_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: kas_besar kas_besar_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kas_besar
    ADD CONSTRAINT kas_besar_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: kas_mutations kas_mutations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kas_mutations
    ADD CONSTRAINT kas_mutations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: products products_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: stock_logs stock_logs_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_logs
    ADD CONSTRAINT stock_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_logs stock_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_logs
    ADD CONSTRAINT stock_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: transaction_items transaction_items_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT transaction_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict yA7KJFMBxtb3pFIO1V2NfdhPje75IWta0yJjrL7HqTcGwbxIWFfCROqIhHhcCnT

