/*
 * Knowledge-base article index: the single source of truth for
 * knowledge-base.html (cards, search, filters, stats) and for article pages
 * (previous/next and related links).
 *
 * Array order = reading order (previous/next) and card order on the index.
 * The array must stay valid JSON (double quotes, no trailing commas, no comments
 * inside it) because tools/kb-check.py parses it.
 *
 * Fields:
 *   slug         file name in articles/ without .html
 *   title        same text as the article's <h1>
 *   description  one or two sentences, shown on the card and searched
 *   category     primary category: one of KB_CATEGORIES below
 *   tags         lowercase topics, shown on cards and clickable as filters
 *   level        "beginner" | "intermediate" | "advanced"
 *   minutes      reading time: words inside <article> / 200, rounded up (kb-check.py computes it)
 *   published    YYYY-MM-DD
 *   updated      YYYY-MM-DD or "" (only set when the article is revised)
 *   keywords     extra search terms: commands, technologies, error messages
 *   related      optional list of slugs; empty = pick automatically by category/tags
 */
window.KB_CATEGORIES = [
  "Kubernetes", "OpenShift", "Linux", "DNS", "Security",
  "Networking", "Storage", "Containers", "Automation", "Monitoring",
  "Crypto"
];

window.KB_ARTICLES = [
  {
    "slug": "troubleshooting-pods-not-running",
    "title": "Troubleshooting Kubernetes / OpenShift Pods That Are Not Running",
    "description": "A systematic workflow for Pending, ContainerCreating, Init, ImagePullBackOff, CrashLoopBackOff and Terminating pods, with exit codes and event messages explained.",
    "category": "Kubernetes",
    "tags": ["kubernetes", "openshift", "troubleshooting"],
    "level": "intermediate",
    "minutes": 15,
    "published": "2026-09-29",
    "updated": "",
    "keywords": "pod pods kubectl oc describe logs events crashloopbackoff imagepullbackoff errimagepull pending containercreating init container terminating oomkilled exit code liveness readiness startup probe pvc storage volume secret configmap createcontainerconfigerror scc crictl oc debug finalizers pull secret registry",
    "related": ["kubernetes-pod-scheduling", "dns-troubleshooting-linux"]
  },
  {
    "slug": "kubernetes-pod-scheduling",
    "title": "Kubernetes Taints, Tolerations, Node Selectors and Pod Scheduling",
    "description": "How the scheduler places pods: nodeSelector, node affinity, anti-affinity, taint effects, dedicated OpenShift infra nodes, and decoding \"0/6 nodes are available\".",
    "category": "Kubernetes",
    "tags": ["kubernetes", "openshift", "system administration", "troubleshooting"],
    "level": "advanced",
    "minutes": 11,
    "published": "2026-09-29",
    "updated": "",
    "keywords": "scheduler kube-scheduler taint taints toleration tolerations nodeselector node affinity pod affinity anti-affinity noschedule prefernoschedule noexecute infra nodes ingresscontroller router image registry operator olm subscription machineset failedscheduling preemption topologyspreadconstraints cordon pod pods labels",
    "related": []
  },
  {
    "slug": "linux-disk-space-troubleshooting",
    "title": "Linux Disk Space Troubleshooting Guide",
    "description": "Find what is filling a filesystem: df vs du, deleted-but-open files, inode exhaustion, journald, dnf caches, container storage and LVM, with safe cleanup steps.",
    "category": "Linux",
    "tags": ["linux", "rhel", "troubleshooting", "system administration"],
    "level": "intermediate",
    "minutes": 12,
    "published": "2026-09-29",
    "updated": "",
    "keywords": "disk space storage filesystem df du find lsof inode inodes no space left on device journalctl journald logrotate logs /var/log dnf yum cache kernel /boot podman docker containers lvm lvextend xfs ext4 truncate cleanup",
    "related": []
  },
  {
    "slug": "dns-troubleshooting-linux",
    "title": "DNS Troubleshooting on Linux",
    "description": "How name resolution really works on Linux, dig vs getent, NXDOMAIN, SERVFAIL and timeouts, caching layers, reverse DNS, and BIND configuration checks.",
    "category": "DNS",
    "tags": ["dns", "linux", "rhel", "troubleshooting"],
    "level": "intermediate",
    "minutes": 12,
    "published": "2026-09-29",
    "updated": "",
    "keywords": "dig nslookup host getent resolvectl resolv.conf nsswitch /etc/hosts networkmanager nmcli systemd-resolved bind named rndc named-checkconf named-checkzone nxdomain servfail refused timeout ttl cache ptr reverse a aaaa cname mx ns soa dnssec coredns networking",
    "related": []
  },
  {
    "slug": "bitcoin-node-docker-ubuntu",
    "title": "Running a Bitcoin Full Node on Ubuntu with Bitcoin Core in Docker",
    "description": "Verify and package Bitcoin Core in a Docker image on Ubuntu, keep the blockchain on persistent storage, open port 8333 and follow the initial sync with bitcoin-cli.",
    "category": "Crypto",
    "tags": ["bitcoin", "docker", "linux", "ubuntu"],
    "level": "intermediate",
    "minutes": 18,
    "published": "2026-10-19",
    "updated": "",
    "keywords": "bitcoin core bitcoind bitcoin-cli full node btc blockchain docker compose dockerfile container sha256sums gpg guix.sigs verify signature port 8333 rpc 8332 bitcoin.conf dbcache prune ibd initial block download sync getblockchaininfo getnetworkinfo genesis block satoshi bitnodes self-hosting",
    "related": []
  }
];
