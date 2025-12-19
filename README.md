# 🛡️ Windows Event Forwarding (WEF) with Active Directory
## Complete Enterprise Implementation & Troubleshooting Guide

---

<div align="center">

### 📋 Document Information

| **Field** | **Details** |
|-----------|-------------|
| **Document Title** | Windows Event Forwarding (WEF) Enterprise Playbook |
| **Version** | 1.0 |
| **Created By** | EONCyber Team |
| **Domain** | ADEON.COM |
| **Last Updated** | December 2024 |

</div>

---

## 📖 What This Document Achieves

This document provides a **step-by-step guide** to implement **Windows Event Forwarding (WEF)** in an Active Directory environment. By the end of this guide, you will have:

✅ **Centralized log collection** from all Windows workstations  
✅ **No agent deployment** required on endpoints  
✅ **Native Windows technology** (no third-party tools)  
✅ **Kerberos-based secure authentication**  
✅ **SIEM-ready** event forwarding  

---

## 🖥️ Environment Overview

| **Component** | **Details** |
|---------------|-------------|
| 🖥️ **Collector Server** | Windows Server 2019/2022 (Domain Controller) |
| 💻 **Source Clients** | Windows 11 Pro Workstations |
| 🌐 **Domain** | ADEON.COM |
| 📡 **Transport Protocol** | WinRM over HTTP |
| 🔐 **Authentication** | Kerberos |
| 🚪 **Port Used** | TCP 5985 |
| 📂 **Log Destination** | Event Viewer → Forwarded Events |

---

# 🏗️ High-Level Architecture Overview

## 📊 How Windows Event Forwarding Works

Windows Event Forwarding enables centralized collection of event logs from multiple source computers to a single collector server. Here's the simple flow:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WEF ARCHITECTURE FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   🖥️ Windows 11 PC                                                 │
│   (Event Source)                                                    │
│         │                                                           │
│         │  ① Events generated locally                               │
│         ▼                                                           │
│   ┌─────────────┐                                                   │
│   │   WinRM     │  ← Windows Remote Management Service             │
│   │  (TCP 5985) │                                                   │
│   └─────────────┘                                                   │
│         │                                                           │
│         │  ② Events pushed via WinRM/HTTP                          │
│         ▼                                                           │
│   🔐 Kerberos Authentication                                        │
│         │                                                           │
│         │  ③ Secure authentication via AD                          │
│         ▼                                                           │
│   🖥️ Active Directory Server                                        │
│   (Windows Event Collector)                                         │
│         │                                                           │
│         │  ④ Events stored in Forwarded Events log                 │
│         ▼                                                           │
│   📊 SIEM / Analysis                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 🔑 Key Components Explained

| **Component** | **Role** | **Why It's Important** |
|---------------|----------|------------------------|
| 🖥️ **Source Computer** | Windows 11 workstation that generates events | Where security logs originate |
| 📡 **WinRM Service** | Transport layer for event forwarding | Carries events over HTTP/HTTPS |
| 🔐 **Kerberos** | Authentication mechanism | Ensures secure, trusted communication |
| 🗄️ **Event Collector** | Domain Controller receiving events | Central repository for all logs |
| 📋 **Subscription** | Configuration defining what events to forward | Filters and controls event flow |

> **[📸 Screenshot Placeholder: Architecture Diagram - Draw a visual diagram showing the flow between components]**

---

# 📋 Pre-Implementation Checklist

Before starting, ensure you have the following ready:

| ☐ | **Requirement** | **Description** |
|---|-----------------|-----------------|
| ☐ | Domain Admin Access | Required for GPO and AD configuration |
| ☐ | Windows Server 2019/2022 | Acting as Domain Controller + Event Collector |
| ☐ | Windows 11 Pro Client | Domain-joined workstation for testing |
| ☐ | Network Connectivity | Port 5985 open between client and server |
| ☐ | Active Directory | Properly configured and functional |
| ☐ | DNS Resolution | Both machines must resolve each other's FQDN |

---

# 🚀 IMPLEMENTATION PHASES

---

## 🔹 Phase 1: Active Directory Preparation

---

### 🎯 Objective

Create a dedicated **Organizational Unit (OU)** in Active Directory to isolate Windows 11 workstations. This provides:
- Clean GPO application
- Prevents inheritance conflicts
- Easier troubleshooting

---

### 🛠️ Prerequisites

| **Requirement** | **Details** |
|-----------------|-------------|
| 🔐 Permissions | Domain Administrator |
| 🛠️ Tool Required | Active Directory Users and Computers (ADUC) |
| 🖥️ Run On | Domain Controller |

---

### 🪜 Step-by-Step Implementation

---

#### 🔹 Step 1.1: Open Active Directory Users and Computers

📍 **Navigation Path:**
```
Server Manager → Tools → Active Directory Users and Computers
```

📝 **Explanation:**  
ADUC is the primary management console for organizing users, computers, and groups in Active Directory.

> **[📸 Screenshot Placeholder: Server Manager with Tools menu open showing ADUC option]**

---

#### 🔹 Step 1.2: Create New Organizational Unit

📍 **Navigation Path:**
```
ADUC → Right-click on domain root (ADEON.COM) → New → Organizational Unit
```

🛠️ **Configuration:**

| **Field** | **Value** |
|-----------|-----------|
| **Name** | `Surat Office` (or your preferred name) |
| **Protect from deletion** | ☐ Uncheck (for testing flexibility) |

📝 **Explanation:**  
Creating a dedicated OU allows you to apply specific Group Policies only to the computers in this container, without affecting other domain computers.

> **[📸 Screenshot Placeholder: New Organizational Unit dialog box]**

---

#### 🔹 Step 1.3: Verify OU Creation

💻 **Command:**  
*Run this PowerShell command on Domain Controller to verify:*

```powershell
Get-ADOrganizationalUnit -Filter 'Name -like "*Surat*"'
```

✅ **Expected Output:**
```
DistinguishedName : OU=Surat Office,DC=ADEON,DC=COM
Name              : Surat Office
ObjectClass       : organizationalUnit
```

> **[📸 Screenshot Placeholder: PowerShell output showing OU details]**

---

### ⚠️ Important Note

> **🔔 Critical Information:**  
> OU isolation works perfectly for client computers but **does NOT work for Domain Controllers**. Domain Controllers always reside in the "Domain Controllers" OU and cannot escape domain-level GPOs. This becomes important in troubleshooting!

---

## 🔹 Phase 2: Domain Join Operations

---

### 🎯 Objective

Join the Windows 11 Pro workstation to the **ADEON.COM** domain and verify successful integration with Active Directory.

---

### 🛠️ Prerequisites

| **Requirement** | **Details** |
|-----------------|-------------|
| 🔐 Credentials | Domain Administrator (ADEON\Administrator) |
| 🌐 Network | Client must reach Domain Controller |
| 📡 DNS | Client DNS pointing to Domain Controller |

---

### 🪜 Step-by-Step Implementation

---

#### 🔹 Step 2.1: Open System Properties

📍 **Navigation Path (Windows 11):**
```
Settings (Win + I) → System → About → Domain or workgroup
```

**OR** use keyboard shortcut:

💻 **Command:**
```
sysdm.cpl
```

📝 **Explanation:**  
This opens the System Properties dialog where you can change the computer's domain membership.

> **[📸 Screenshot Placeholder: Windows 11 Settings → About page]**

---

#### 🔹 Step 2.2: Join the Domain

📍 **Steps:**
1. Click **"Change..."** button
2. Select **"Domain"** radio button
3. Enter domain name: **`ADEON.COM`**
4. Click **OK**
5. Enter Domain Administrator credentials when prompted
6. Click **OK** on "Welcome to ADEON.COM domain" message
7. **Restart** the computer when prompted

> **[📸 Screenshot Placeholder: Computer Name/Domain Changes dialog with domain selected]**

> **[📸 Screenshot Placeholder: Credential prompt for domain join]**

> **[📸 Screenshot Placeholder: Welcome to domain message]**

---

#### 🔹 Step 2.3: Verify Domain Membership (On Windows 11 Client)

💻 **Command (CMD):**
```cmd
systeminfo | findstr /i "Domain"
```

✅ **Expected Output:**
```
Domain:                    ADEON.COM
Logon Server:              \\AD-EON
```

---

💻 **Alternative PowerShell Command:**
```powershell
Get-ComputerInfo | Select-Object CsDomain, CsDomainRole
```

✅ **Expected Output:**
```
CsDomain    CsDomainRole
--------    ------------
ADEON.COM   MemberWorkstation
```

> **[📸 Screenshot Placeholder: Command output showing domain membership]**

---

#### 🔹 Step 2.4: Verify Computer Object in Active Directory (On Domain Controller)

💻 **PowerShell Command:**
```powershell
Get-ADComputer -Filter 'Name -like "*WIN11*"' | Select-Object Name, DistinguishedName
```

✅ **Expected Output:**
```
Name           DistinguishedName
----           -----------------
WIN11-PC01     CN=WIN11-PC01,OU=Surat Office,DC=ADEON,DC=COM
```

📝 **Explanation:**  
This confirms the computer object exists in AD and is placed in the correct OU.

> **[📸 Screenshot Placeholder: ADUC showing computer in Surat Office OU]**

---

### 💡 FAQ: Does The Logged-In User Matter?

> **❓ Question:** "I am using a local user account, not a domain user — is that a problem for WEF?"
>
> **✅ Answer:** **NO, this is NOT a problem!**
>
> WEF operates at the **computer account level**, not user level:
> - Uses the machine account (`WIN11-PC01$`) for authentication
> - The logged-in user is irrelevant to WEF functionality
> - Works with local users, domain users, or Microsoft accounts

---

## 🔹 Phase 3: Windows Event Collector Configuration (Server Side)

---

### 🎯 Objective

Configure the Domain Controller (AD-EON) to act as the **Windows Event Collector (WEC)** that will receive forwarded events from client computers.

---

### 🛠️ Prerequisites

| **Requirement** | **Details** |
|-----------------|-------------|
| 🔐 Permissions | Local Administrator on Server |
| 🖥️ Run On | Domain Controller (AD-EON) |

---

### 🪜 Step-by-Step Implementation

---

#### 🔹 Step 3.1: Configure Windows Event Collector Service

💻 **Command (Run as Administrator):**
```cmd
wecutil qc
```

📝 **Explanation:**  
This command performs the "quick configuration" for Windows Event Collector:
- Starts the Windows Event Collector service (Wecsvc)
- Sets service startup type to **Automatic (Delayed Start)**
- Creates the necessary firewall exceptions

✅ **Expected Prompt:**
```
Windows Event Collector Utility

Current configuration is invalid.

Would you like to configure Windows Event Collector? [y/n]: y

The command completed successfully.
```

> **[📸 Screenshot Placeholder: wecutil qc command output]**

---

#### 🔹 Step 3.2: Verify Windows Event Collector Service

💻 **Command:**
```cmd
sc query wecsvc
```

✅ **Expected Output:**
```
SERVICE_NAME: wecsvc
        TYPE               : 20  WIN32_SHARE_PROCESS
        STATE              : 4  RUNNING
        WIN32_EXIT_CODE    : 0  (0x0)
```

📝 **Explanation:**  
The Windows Event Collector service (wecsvc) must be **RUNNING** for event collection to work.

> **[📸 Screenshot Placeholder: Service status showing RUNNING]**

---

#### 🔹 Step 3.3: Configure WinRM Service on Server

💻 **Command:**
```cmd
winrm quickconfig
```

✅ **Expected Output:**
```
WinRM service is already running on this machine.
WinRM is already set up for remote management on this computer.
```

📝 **Explanation:**  
Ensures WinRM (Windows Remote Management) is properly configured to receive incoming connections.

> **[📸 Screenshot Placeholder: winrm quickconfig output]**

---

#### 🔹 Step 3.4: Verify WinRM Listeners

💻 **Command:**
```cmd
winrm enumerate winrm/config/listener
```

✅ **Expected Output:**
```
Listener
    Address = *
    Transport = HTTP
    Port = 5985
    Hostname
    Enabled = true
    URLPrefix = wsman
    ListeningOn = 192.168.1.10, 127.0.0.1
```

⚠️ **Critical Check:**  
Ensure `ListeningOn` shows your server's IP address. If it shows `null`, there's a network profile issue (covered in troubleshooting).

> **[📸 Screenshot Placeholder: WinRM listener configuration]**

---

## 🔹 Phase 4: Create Event Forwarding Subscription

---

### 🎯 Objective

Create a **subscription** on the collector server that defines:
- Which computers send events
- What events to collect
- How events are delivered

---

### 🪜 Step-by-Step Implementation

---

#### 🔹 Step 4.1: Open Event Viewer

📍 **Navigation Path:**
```
Server Manager → Tools → Event Viewer
```

**OR**

💻 **Command:**
```cmd
eventvwr.msc
```

> **[📸 Screenshot Placeholder: Event Viewer main window]**

---

#### 🔹 Step 4.2: Create New Subscription

📍 **Navigation Path:**
```
Event Viewer → Subscriptions → Right-click → Create Subscription
```

> **[📸 Screenshot Placeholder: Creating new subscription context menu]**

---

#### 🔹 Step 4.3: Configure Subscription Settings

Fill in the subscription dialog as follows:

| **Field** | **Value** |
|-----------|-----------|
| **Subscription name** | `WEF-Subscription` |
| **Description** | `Collect security events from domain workstations` |
| **Destination log** | `Forwarded Events` |
| **Subscription type** | ◉ **Source computer initiated** |

---

#### 🔹 Step 4.4: Configure Computer Groups

1. Click **"Select Computer Groups..."**
2. Click **"Add Domain Computers..."**
3. Enter: `Domain Computers` (or specific computer name)
4. Click **OK**

📝 **Explanation:**  
"Source computer initiated" means clients will push events to the collector. This is the recommended approach for domain environments.

> **[📸 Screenshot Placeholder: Computer Groups selection dialog]**

---

#### 🔹 Step 4.5: Configure Events Filter

1. Click **"Select Events..."**
2. Configure the filter:

| **Setting** | **Value** |
|-------------|-----------|
| **Event logs** | ☑ Security, ☑ System, ☑ Application |
| **Event level** | ☑ Critical, ☑ Error, ☑ Warning, ☑ Information |

3. Click **OK**

> **[📸 Screenshot Placeholder: Event filter configuration]**

---

#### 🔹 Step 4.6: Configure Advanced Settings

1. Click **"Advanced..."**
2. Set the following:

| **Setting** | **Value** |
|-------------|-----------|
| **Machine Account** | ◉ Selected (for Kerberos auth) |
| **Protocol** | HTTP |
| **Port** | 5985 |
| **Event Delivery Optimization** | ◉ Minimize Latency |

3. Click **OK** to close Advanced
4. Click **OK** to create subscription

> **[📸 Screenshot Placeholder: Advanced subscription settings]**

---

#### 🔹 Step 4.7: Verify Subscription Created

💻 **Command:**
```cmd
wecutil es
```

✅ **Expected Output:**
```
WEF-Subscription
```

💻 **Get detailed subscription info:**
```cmd
wecutil gs WEF-Subscription
```

> **[📸 Screenshot Placeholder: Subscription details from wecutil]**

---

## 🔹 Phase 5: Group Policy Configuration (Client Side)

---

### 🎯 Objective

Create and configure a **Group Policy Object (GPO)** to:
- Enable WinRM service on Windows 11 clients
- Configure clients to contact the Event Collector
- Grant necessary permissions for event forwarding

---

### 🛠️ Prerequisites

| **Requirement** | **Details** |
|-----------------|-------------|
| 🔐 Permissions | Domain Administrator |
| 🛠️ Tool | Group Policy Management Console (GPMC) |
| 🖥️ Run On | Domain Controller |

---

### 🪜 Step-by-Step Implementation

---

#### 🔹 Step 5.1: Open Group Policy Management

📍 **Navigation Path:**
```
Server Manager → Tools → Group Policy Management
```

**OR**

💻 **Command:**
```cmd
gpmc.msc
```

> **[📸 Screenshot Placeholder: Group Policy Management Console]**

---

#### 🔹 Step 5.2: Create New GPO

📍 **Navigation Path:**
```
Forest → Domains → ADEON.COM → Group Policy Objects → Right-click → New
```

| **Field** | **Value** |
|-----------|-----------|
| **Name** | `Windows Event Forwarding` |

> **[📸 Screenshot Placeholder: New GPO dialog]**

---

#### 🔹 Step 5.3: Link GPO to OU

📍 **Steps:**
1. Navigate to: `ADEON.COM → Surat Office`
2. Right-click **"Surat Office"**
3. Select **"Link an Existing GPO..."**
4. Select **"Windows Event Forwarding"**
5. Click **OK**

> **[📸 Screenshot Placeholder: Link GPO dialog]**

---

#### 🔹 Step 5.4: Edit GPO - Configure WinRM Service

📍 **Navigation Path in GPO Editor:**
```
Computer Configuration
  └── Policies
        └── Windows Settings
              └── Security Settings
                    └── System Services
```

🔧 **Setting to Configure:**

| **Service** | **Configuration** |
|-------------|-------------------|
| **Windows Remote Management (WS-Management)** | Startup Mode: **Automatic** |

📝 **Steps:**
1. Double-click "Windows Remote Management (WS-Management)"
2. Check ☑ "Define this policy setting"
3. Select ◉ "Automatic"
4. Click **OK**

> **[📸 Screenshot Placeholder: WinRM Service configuration in GPO]**

---

#### 🔹 Step 5.5: Configure Subscription Manager (CRITICAL SETTING)

📍 **Navigation Path in GPO Editor:**
```
Computer Configuration
  └── Policies
        └── Administrative Templates
              └── Windows Components
                    └── Event Forwarding
```

🔧 **Setting:** `Configure target Subscription Manager`

| **Configuration** | **Value** |
|-------------------|-----------|
| **State** | ◉ Enabled |
| **SubscriptionManager** | See below |

💻 **SubscriptionManager Value:**
```
Server=http://AD-EON.ADEON.COM:5985/wsman/SubscriptionManager/WEC,Refresh=120
```

📝 **Breaking Down This String:**

| **Part** | **Meaning** |
|----------|-------------|
| `Server=` | Indicates collector address |
| `http://AD-EON.ADEON.COM:5985` | WinRM HTTP endpoint |
| `/wsman/SubscriptionManager/WEC` | WEC endpoint path |
| `Refresh=120` | Client checks subscription every 120 seconds |

> **[📸 Screenshot Placeholder: Subscription Manager configuration]**

---

#### 🔹 Step 5.6: Configure Event Log Readers Permission

📍 **Navigation Path in GPO Editor:**
```
Computer Configuration
  └── Policies
        └── Administrative Templates
              └── Windows Components
                    └── Event Log Service
                          └── Security
```

🔧 **Setting:** `Configure log access`

| **Configuration** | **Value** |
|-------------------|-----------|
| **State** | ◉ Enabled |
| **Log Access (SDDL)** | See below |

💻 **SDDL Value:**
```
O:BAG:SYD:(A;;0xf0005;;;SY)(A;;0x5;;;BA)(A;;0x1;;;S-1-5-32-573)(A;;0x1;;;S-1-5-20)
```

📝 **Explanation:**  
This grants **NETWORK SERVICE** account permission to read event logs, required for WinRM to access logs during forwarding.

> **[📸 Screenshot Placeholder: Log access configuration]**

---

#### 🔹 Step 5.7: Apply GPO to Client

💻 **On Windows 11 Client - Run as Administrator:**

```cmd
gpupdate /force
```

✅ **Expected Output:**
```
Updating policy...

Computer Policy update has completed successfully.
User Policy update has completed successfully.
```

> **[📸 Screenshot Placeholder: gpupdate output]**

---

#### 🔹 Step 5.8: Verify GPO Application

💻 **Command:**
```cmd
gpresult /r /scope computer
```

✅ **Look for in output:**
```
COMPUTER SETTINGS
------------------
    Applied Group Policy Objects
    -----------------------------
        Windows Event Forwarding
        Default Domain Policy
```

> **[📸 Screenshot Placeholder: gpresult output]**

---

#### 🔹 Step 5.9: Verify Registry Entry

💻 **Command:**
```cmd
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\EventLog\EventForwarding\SubscriptionManager
```

✅ **Expected Output:**
```
HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\EventLog\EventForwarding\SubscriptionManager
    1    REG_SZ    Server=http://AD-EON.ADEON.COM:5985/wsman/SubscriptionManager/WEC,Refresh=120
```

> **[📸 Screenshot Placeholder: Registry verification]**

---

## 🔹 Phase 6: Final Client-Side Configuration

---

### 🎯 Objective

Ensure WinRM is properly configured on Windows 11 client and can communicate with the collector.

---

### 🪜 Step-by-Step Implementation

---

#### 🔹 Step 6.1: Configure WinRM on Client

💻 **Command (Run as Administrator):**
```cmd
winrm quickconfig
```

✅ **Expected Output:**
```
WinRM service is already running on this machine.
WinRM is already set up for remote management on this computer.
```

---

#### 🔹 Step 6.2: Verify WinRM Listener on Client

💻 **Command:**
```cmd
winrm enumerate winrm/config/listener
```

✅ **Critical Check:**  
`ListeningOn` must show the client's IP address, NOT `null`.

---

#### 🔹 Step 6.3: Restart WinRM Service

💻 **Commands:**
```cmd
net stop winrm
net start winrm
```

---

#### 🔹 Step 6.4: Test Connectivity to Collector

💻 **Command from Client:**
```powershell
Test-NetConnection -ComputerName AD-EON.ADEON.COM -Port 5985
```

✅ **Expected Output:**
```
ComputerName     : AD-EON.ADEON.COM
RemoteAddress    : 192.168.1.10
RemotePort       : 5985
TcpTestSucceeded : True
```

> **[📸 Screenshot Placeholder: Network connectivity test]**

---

# ✅ VERIFICATION & VALIDATION PHASE

---

## 🔍 How to Confirm Everything is Working

---

### ✔️ Check 1: Subscription Source Computers (On Server)

📍 **Navigation Path:**
```
Event Viewer → Subscriptions → Right-click WEF-Subscription → Runtime Status
```

✅ **Expected Result:**  
- Source Computers should show **1 (or more) Active**
- Status should show **Active**

💻 **Alternative Command:**
```cmd
wecutil gr WEF-Subscription
```

> **[📸 Screenshot Placeholder: Subscription runtime status showing active computers]**

---

### ✔️ Check 2: Forwarded Events Log (On Server)

📍 **Navigation Path:**
```
Event Viewer → Windows Logs → Forwarded Events
```

✅ **Expected Result:**  
Events from the Windows 11 client should appear here.

> **[📸 Screenshot Placeholder: Forwarded Events log with events from client]**

---

### ✔️ Check 3: Generate Test Event (On Client)

💻 **Create a test security event:**
```cmd
net user testuser P@ssw0rd! /add
net user testuser /delete
```

📝 **Explanation:**  
Creating and deleting a user generates Event IDs 4720 and 4726 in the Security log, which should be forwarded to the collector.

---

### ✔️ Check 4: Verify Services Running

| **Computer** | **Service** | **Command** | **Expected State** |
|--------------|-------------|-------------|-------------------|
| Server | Windows Event Collector | `sc query wecsvc` | RUNNING |
| Server | WinRM | `sc query winrm` | RUNNING |
| Client | WinRM | `sc query winrm` | RUNNING |

---

### ✔️ Success Criteria Summary

| ☐ | **Verification Item** | **Status** |
|---|----------------------|-----------|
| ☐ | WinRM running on server | _________ |
| ☐ | WinRM running on client | _________ |
| ☐ | Wecsvc running on server | _________ |
| ☐ | GPO applied to client | _________ |
| ☐ | Registry entry present | _________ |
| ☐ | Subscription shows active sources | _________ |
| ☐ | Events appearing in Forwarded Events | _________ |

---

# 🧩 COMMAND & TOOL REFERENCE SECTION

---

## 📚 All Commands Explained

This section provides a comprehensive reference of all commands used in this guide.

---

### 🔸 wecutil (Windows Event Collector Utility)

| **Command** | **Purpose** | **When to Use** |
|-------------|-------------|-----------------|
| `wecutil qc` | Quick configuration of Event Collector | Initial setup on server |
| `wecutil es` | Enumerate (list) all subscriptions | Verify subscriptions exist |
| `wecutil gs <name>` | Get subscription details | View subscription configuration |
| `wecutil gr <name>` | Get runtime status | Check active source computers |
| `wecutil ss <name>` | Set subscription properties | Modify subscription settings |
| `wecutil rs <name>` | Retry subscription | Force subscription refresh |
| `wecutil ds <name>` | Delete subscription | Remove a subscription |

💻 **Example - Check subscription status:**
```cmd
wecutil gr WEF-Subscription
```

---

### 🔸 winrm (Windows Remote Management)

| **Command** | **Purpose** | **When to Use** |
|-------------|-------------|-----------------|
| `winrm quickconfig` | Quick configuration of WinRM | Initial setup |
| `winrm quickconfig -force` | Force reconfiguration | Reset WinRM settings |
| `winrm enumerate winrm/config/listener` | List all listeners | Verify listener configuration |
| `winrm get winrm/config` | Get full WinRM config | Deep diagnostics |
| `winrm delete winrm/config/listener?Address=*+Transport=HTTP` | Delete listener | Troubleshooting |
| `winrm create winrm/config/listener?Address=*+Transport=HTTP` | Create listener | After deleting listener |

💻 **Example - View full configuration:**
```cmd
winrm get winrm/config
```

---

### 🔸 Service Management Commands

| **Command** | **Purpose** |
|-------------|-------------|
| `sc query winrm` | Check WinRM service status |
| `sc query wecsvc` | Check Event Collector service status |
| `net stop winrm` | Stop WinRM service |
| `net start winrm` | Start WinRM service |
| `net stop wecsvc` | Stop Event Collector service |
| `net start wecsvc` | Start Event Collector service |

---

### 🔸 Group Policy Commands

| **Command** | **Purpose** |
|-------------|-------------|
| `gpupdate /force` | Force immediate GPO refresh |
| `gpresult /r /scope computer` | View applied computer policies |
| `gpresult /h result.html` | Generate detailed HTML report |

---

### 🔸 Network Diagnostic Commands

| **Command** | **Purpose** |
|-------------|-------------|
| `Test-NetConnection -ComputerName <server> -Port 5985` | Test WinRM port connectivity |
| `netstat -an \| findstr 5985` | Check if port 5985 is listening |
| `ping <server>` | Basic connectivity test |
| `nslookup <server>` | DNS resolution test |

---

### 🔸 Registry Paths Reference

| **Purpose** | **Registry Path** |
|-------------|-------------------|
| Subscription Manager | `HKLM\SOFTWARE\Policies\Microsoft\Windows\EventLog\EventForwarding\SubscriptionManager` |
| WinRM Config | `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WSMAN` |
| Network Profile | `HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\NetworkList\Profiles` |

---

# 🔧 TROUBLESHOOTING SECTION

---

## ❌ Issue 1: Subscription Shows 0 Source Computers

---

| **Aspect** | **Details** |
|------------|-------------|
| 🔍 **Symptom** | Subscription is active but shows "0 Source Computers" |
| 📍 **Location** | Event Viewer → Subscriptions → Runtime Status |

### 🛠️ Troubleshooting Steps:

**Step 1: Verify GPO Application on Client**

💻 *Command (on client):*
```cmd
gpresult /r /scope computer | findstr "Event"
```

✅ Should show "Windows Event Forwarding" in applied GPOs.

---

**Step 2: Verify Registry Entry**

💻 *Command (on client):*
```cmd
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\EventLog\EventForwarding\SubscriptionManager
```

✅ Should show the subscription manager URL.

---

**Step 3: Test Network Connectivity**

💻 *Command (on client):*
```powershell
Test-NetConnection -ComputerName AD-EON.ADEON.COM -Port 5985
```

✅ `TcpTestSucceeded` should be `True`.

---

**Step 4: Restart WinRM Service**

💻 *Commands (on client):*
```cmd
net stop winrm
net start winrm
```

---

**Step 5: Force Subscription Retry**

💻 *Command (on server):*
```cmd
wecutil rs WEF-Subscription
```

> **[📸 Screenshot Placeholder: Subscription showing 0 active computers]**

---

## ❌ Issue 2: WinRM ListeningOn Shows NULL

---

| **Aspect** | **Details** |
|------------|-------------|
| 🔍 **Symptom** | `winrm enumerate winrm/config/listener` shows `ListeningOn = null` |
| 🔥 **Root Cause** | Network profile is set to **Public** instead of **Domain** or **Private** |

### 🛠️ Solution:

**Step 1: Check Current Network Profile**

💻 *PowerShell Command:*
```powershell
Get-NetConnectionProfile
```

❌ **Problem if shows:**
```
NetworkCategory : Public
```

---

**Step 2: Change Network Profile to Domain**

💻 *PowerShell Command (Run as Administrator):*
```powershell
Set-NetConnectionProfile -InterfaceAlias "Ethernet" -NetworkCategory DomainAuthenticated
```

📝 Replace "Ethernet" with your actual network interface name.

---

**Step 3: Alternative - Via Registry (If GPO Blocked)**

📍 *Registry Path:*
```
HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\NetworkList\Profiles\<ProfileGUID>
```

🔧 *Change Value:*
| **Value Name** | **Change From** | **Change To** |
|----------------|-----------------|---------------|
| `Category` | `0` (Public) | `1` (Private) or `2` (Domain) |

---

**Step 4: Restart WinRM**

💻 *Commands:*
```cmd
net stop winrm
net start winrm
```

---

**Step 5: Verify Fix**

💻 *Command:*
```cmd
winrm enumerate winrm/config/listener
```

✅ `ListeningOn` should now show IP addresses.

> **[📸 Screenshot Placeholder: Before - ListeningOn = null]**

> **[📸 Screenshot Placeholder: After - ListeningOn = 192.168.x.x]**

---

## ❌ Issue 3: Access Denied Error (0x80070005)

---

| **Aspect** | **Details** |
|------------|-------------|
| 🔍 **Symptom** | Access denied errors when trying to forward events |
| 📍 **Error Code** | 0x80070005 |

### 🛠️ Troubleshooting Steps:

**Step 1: Verify Event Log Readers Permission**

The **NETWORK SERVICE** account needs permission to read event logs.

💻 *Check current permissions:*
```cmd
wevtutil gl Security
```

---

**Step 2: Add NETWORK SERVICE to Event Log Readers Group**

📍 *Via Group Policy:*
```
Computer Configuration → Policies → Windows Settings → Security Settings → Restricted Groups
```

Add: `NT AUTHORITY\NETWORK SERVICE` to `Event Log Readers` group.

---

**Step 3: Alternative - Manual SDDL Configuration**

📍 *GPO Path:*
```
Computer Configuration → Administrative Templates → Windows Components → Event Log Service → Security → Configure log access
```

💻 *SDDL Value:*
```
O:BAG:SYD:(A;;0xf0005;;;SY)(A;;0x5;;;BA)(A;;0x1;;;S-1-5-32-573)(A;;0x1;;;S-1-5-20)
```

---

## ❌ Issue 4: WinRM Service Won't Start

---

| **Aspect** | **Details** |
|------------|-------------|
| 🔍 **Symptom** | WinRM service fails to start or starts then stops |
| 📍 **Event Log** | Check System log for Event ID 10154 |

### 🛠️ Troubleshooting Steps:

**Step 1: Check HTTP Service Dependency**

💻 *Command:*
```cmd
sc query http
```

✅ HTTP service must be **RUNNING**.

---

**Step 2: Reset WinRM Configuration**

💻 *Commands:*
```cmd
winrm delete winrm/config/listener?Address=*+Transport=HTTP
winrm quickconfig -force
```

---

**Step 3: Check Windows Firewall**

💻 *Verify firewall rule exists:*
```powershell
Get-NetFirewallRule -DisplayName "*WinRM*" | Select-Object DisplayName, Enabled
```

---

## ❌ Issue 5: Domain Controller GPO Conflict

---

| **Aspect** | **Details** |
|------------|-------------|
| 🔍 **Symptom** | WinRM settings keep reverting on Domain Controller |
| 🔥 **Root Cause** | Default Domain Controllers Policy conflicts with WEF GPO |

### 🛠️ Solution:

**Option A: Modify Default Domain Controllers Policy**

📍 *Edit the existing policy to include WEF settings.*

---

**Option B: Create Higher Priority GPO**

1. Create GPO with WEF settings
2. Link to Domain Controllers OU
3. Set **Link Order = 1** (highest priority)

📍 *GPO Priority in GPMC:*
Lower number = Higher priority

---

**Option C: Use GPO Enforcement**

1. Right-click on WEF GPO link
2. Select **"Enforced"**

⚠️ **Warning:** Use enforcement carefully as it overrides all other settings.

> **[📸 Screenshot Placeholder: GPO Enforcement setting]**

---

## ❌ Issue 6: Events Not Appearing in Forwarded Events Log

---

| **Aspect** | **Details** |
|------------|-------------|
| 🔍 **Symptom** | Subscription shows active, but no events in log |
| 📍 **Check Location** | Event Viewer → Forwarded Events |

### 🛠️ Troubleshooting Steps:

**Step 1: Check Subscription Event Filter**

💻 *Command:*
```cmd
wecutil gs WEF-Subscription
```

Verify the Query filter isn't too restrictive.

---

**Step 2: Generate Test Events**

💻 *Create test security events on client:*
```cmd
net user testuser P@ssw0rd123! /add
net user testuser /delete
```

---

**Step 3: Check Event Delivery Timing**

By default, events may take 15-20 minutes to appear. For faster delivery:

💻 *Command (on server):*
```cmd
wecutil ss WEF-Subscription /cm:Push
```

---

**Step 4: Check Forwarded Events Log Size**

📍 *Event Viewer → Forwarded Events → Properties*

| **Setting** | **Recommended Value** |
|-------------|----------------------|
| Maximum log size | 4096 KB or higher |
| When maximum size reached | Overwrite events as needed |

---

# 📊 TROUBLESHOOTING QUICK REFERENCE TABLE

| **Issue** | **Quick Check** | **Quick Fix** |
|-----------|-----------------|---------------|
| 0 Source Computers | `gpresult /r` | `gpupdate /force` |
| ListeningOn = null | `Get-NetConnectionProfile` | Change to Domain/Private |
| Access Denied | Check Event Log permissions | Add NETWORK SERVICE |
| Service won't start | `sc query http` | Reset WinRM config |
| GPO conflicts (DC) | Check GPO precedence | Enforce WEF GPO |
| No events | Check filter | Generate test events |

---

# 💡 COMMON MISTAKES & LESSONS LEARNED

---

## ⚠️ Mistake 1: Assuming Domain Join = WEF Ready

**❌ Wrong Assumption:**  
"My computer is domain-joined, so WEF should work automatically."

**✅ Reality:**  
Domain join is necessary but not sufficient. You still need:
- GPO configuration
- WinRM enabled
- Subscription created
- Network profile set correctly

---

## ⚠️ Mistake 2: Ignoring Network Profile

**❌ Wrong Assumption:**  
"Network profile doesn't matter for domain machines."

**✅ Reality:**  
Windows Firewall uses network profiles. If set to **Public**, WinRM listeners won't bind to IP addresses!

**🔑 Key Learning:**  
Always verify network profile on ALL machines:
```powershell
Get-NetConnectionProfile
```

---

## ⚠️ Mistake 3: Not Waiting for GPO Refresh

**❌ Wrong Assumption:**  
"GPO changes apply instantly."

**✅ Reality:**  
Default GPO refresh is ~90 minutes. Always force refresh:
```cmd
gpupdate /force
```

---

## ⚠️ Mistake 4: Using IP Address Instead of FQDN

**❌ Wrong Configuration:**
```
Server=http://192.168.1.10:5985/wsman/SubscriptionManager/WEC
```

**✅ Correct Configuration:**
```
Server=http://AD-EON.ADEON.COM:5985/wsman/SubscriptionManager/WEC
```

**🔑 Key Learning:**  
Kerberos authentication requires FQDN for proper SPN matching.

---

## ⚠️ Mistake 5: Forgetting Domain Controllers Are Special

**❌ Wrong Assumption:**  
"Same GPO works for DCs and clients."

**✅ Reality:**  
Domain Controllers:
- Live in a protected OU
- Have Default Domain Controllers Policy
- May have conflicting security settings

**🔑 Key Learning:**  
If collector is a DC, check for GPO conflicts with `gpresult /h report.html`.

---

## ⚠️ Mistake 6: Not Checking WinRM Listener Status

**❌ Common Oversight:**  
Assuming WinRM is working because the service is running.

**✅ Best Practice:**  
Always verify listener:
```cmd
winrm enumerate winrm/config/listener
```

Check that `ListeningOn` shows actual IP addresses.

---

# 📋 FINAL IMPLEMENTATION CHECKLIST

---

Use this checklist to verify your complete setup:

## 🖥️ Server (Event Collector)

| ☐ | **Task** | **Verification Command** |
|---|----------|--------------------------|
| ☐ | WinRM service running | `sc query winrm` |
| ☐ | Event Collector service running | `sc query wecsvc` |
| ☐ | WinRM listener configured | `winrm enumerate winrm/config/listener` |
| ☐ | Subscription created | `wecutil es` |
| ☐ | Subscription active | `wecutil gr WEF-Subscription` |
| ☐ | Firewall allows port 5985 | `netstat -an \| findstr 5985` |

---

## 💻 Client (Event Source)

| ☐ | **Task** | **Verification Command** |
|---|----------|--------------------------|
| ☐ | Domain joined | `systeminfo \| findstr Domain` |
| ☐ | GPO applied | `gpresult /r /scope computer` |
| ☐ | Registry entry present | `reg query HKLM\...\SubscriptionManager` |
| ☐ | WinRM service running | `sc query winrm` |
| ☐ | WinRM listener bound to IPs | `winrm enumerate winrm/config/listener` |
| ☐ | Network profile = Domain/Private | `Get-NetConnectionProfile` |
| ☐ | Can reach server on port 5985 | `Test-NetConnection <server> -Port 5985` |

---

## ✅ Final Validation

| ☐ | **Validation** | **Where to Check** |
|---|----------------|-------------------|
| ☐ | Source computer shows in subscription | Event Viewer → Subscriptions → Runtime Status |
| ☐ | Events appearing in Forwarded Events | Event Viewer → Windows Logs → Forwarded Events |
| ☐ | Test event forwarded successfully | Create user, check collector for Event ID 4720 |

---

# 📞 QUICK REFERENCE CARD

---

## 🚨 Emergency Commands

**If WEF stops working, run these in order:**

```cmd
REM On Client:
gpupdate /force
net stop winrm && net start winrm

REM On Server:
net stop wecsvc && net start wecsvc
wecutil rs WEF-Subscription
```

---

## 📊 Key Event IDs for Testing

| **Event ID** | **Log** | **Description** | **How to Generate** |
|--------------|---------|-----------------|---------------------|
| 4720 | Security | User created | `net user test P@ss! /add` |
| 4726 | Security | User deleted | `net user test /delete` |
| 4624 | Security | Successful logon | Log in to computer |
| 4625 | Security | Failed logon | Wrong password attempt |

---

## 🌐 Important URLs

| **Resource** | **Usage** |
|--------------|-----------|
| `http://<server>:5985/wsman` | WinRM HTTP endpoint |
| `http://<server>:5985/wsman/SubscriptionManager/WEC` | WEC subscription endpoint |
| `https://<server>:5986/wsman` | WinRM HTTPS endpoint (if configured) |

---

# 📝 DOCUMENT REVISION HISTORY

| **Version** | **Date** | **Author** | **Changes** |
|-------------|----------|------------|-------------|
| 1.0 | December 2024 | EONCyber Team | Initial Release |

---

<div align="center">

## 🎯 End of Document

**Windows Event Forwarding Implementation Guide**

*For questions or issues, refer to the Troubleshooting section*

---

*Document Created by EONCyber Team*

</div>
