import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  system_role: "sys_super_admin" | "regular_user";
}

interface TenantMembership {
  id: string;
  tenant_id: string;
  role: "company_admin" | "manager" | "employee";
  department: string | null;
  job_title: string | null;
  is_suspended?: boolean;
  tenant: {
    id: string;
    name: string;
    domain: string | null;
    logo_url: string | null;
  };
}

interface SignupRequest {
  id: string;
  user_id: string;
  company_name: string;
  status: "pending" | "approved" | "rejected";
  assigned_tenant_id: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  memberships: TenantMembership[];
  currentTenant: TenantMembership | null;
  setCurrentTenant: (membership: TenantMembership | null) => void;
  refreshMemberships: () => Promise<void>; // 명시적으로 멤버십 리스트를 갱신하는 기능 추가
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, companyName: string, companyType?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  signupRequest: SignupRequest | null;
  isPendingApproval: boolean;
  isSuspended: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [currentTenant, setCurrentTenant] = useState<TenantMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupRequest, setSignupRequest] = useState<SignupRequest | null>(null);

  const isSuperAdmin = profile?.system_role === "sys_super_admin";
  const isCompanyAdmin = isSuperAdmin || currentTenant?.role === "company_admin";
  const isPendingApproval = signupRequest?.status === "pending" && memberships.length === 0;
  const isSuspended = currentTenant?.is_suspended === true;

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) return null;
    return data as Profile;
  };

  const fetchMemberships = async (userId: string) => {
    const { data, error } = await supabase
      .from("tenant_memberships")
      .select(`
        id, tenant_id, role, department, job_title, is_suspended,
        tenant:tenants ( id, name, domain, logo_url )
      `)
      .eq("user_id", userId);
    if (error) return [];
    return data as unknown as TenantMembership[];
  };

  const fetchAllTenantsAsMemberships = async () => {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, domain, logo_url")
      .order("name");
    if (error) return [];
    return data.map((t) => ({
      id: `admin-${t.id}`,
      tenant_id: t.id,
      role: "company_admin" as const,
      tenant: t,
      department: "시스템 총괄",
      job_title: "Super Admin",
    })) as TenantMembership[];
  };

  const fetchSignupRequest = async (userId: string) => {
    const { data, error } = await supabase
      .from("signup_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data as SignupRequest | null;
  };

  // 멤버십 정보만 새로고침하는 함수 (슈퍼어드민이 새 테넌트 등록 시 호출용)
  const refreshMemberships = useCallback(async () => {
    if (!user) return;
    
    let mData: TenantMembership[] = [];
    const profileData = await fetchProfile(user.id);
    
    if (profileData?.system_role === "sys_super_admin") {
      mData = await fetchAllTenantsAsMemberships();
    } else {
      mData = await fetchMemberships(user.id);
    }
    
    setMemberships(mData);
    
    // 현재 선택된 회사가 리스트에 없거나 초기 상태라면 첫 번째로 설정
    if (mData.length > 0 && !currentTenant) {
      setCurrentTenant(mData[0]);
    }
  }, [user, currentTenant]);

  const loadUserData = async (userId: string) => {
    try {
      const profileData = await fetchProfile(userId);
      setProfile(profileData);

      let mData: TenantMembership[] = [];
      if (profileData?.system_role === "sys_super_admin") {
        mData = await fetchAllTenantsAsMemberships();
      } else {
        mData = await fetchMemberships(userId);
      }
      
      setMemberships(mData);
      if (mData.length > 0) {
        setCurrentTenant(mData[0]);
      }

      const sData = await fetchSignupRequest(userId);
      setSignupRequest(sData);
    } catch (error) {
      console.error("loadUserData error:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setMemberships([]);
          setCurrentTenant(null);
          setSignupRequest(null);
          setLoading(false);
          return;
        }

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            setTimeout(async () => {
              if (!mounted) return;
              await loadUserData(session.user.id);
              if (mounted) setLoading(false);
            }, 0);
          } else {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, companyName: string, companyType?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });

    if (!error && data.user) {
      const { data: invitations } = await supabase
        .from("employee_invitations")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());

      if (invitations && invitations.length > 0) {
        const invite = invitations[0];
        
        await supabase.from("tenant_memberships").insert([{
          user_id: data.user.id,
          tenant_id: invite.tenant_id,
          role: invite.role as "company_admin" | "manager" | "employee",
          department: invite.department,
          job_title: invite.job_title,
        }]);

        await supabase
          .from("employee_invitations")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", invite.id);
      } else {
        await supabase.from("signup_requests").insert({
          user_id: data.user.id,
          company_name: companyName,
          ...(companyType ? { company_type: companyType } : {}),
        } as any);
      }
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Sign out error:", error);
    }

    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (e) {
      console.warn("Storage clear error:", e);
    }

    setSession(null);
    setUser(null);
    setProfile(null);
    setMemberships([]);
    setCurrentTenant(null);
    setSignupRequest(null);

    window.location.replace("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        memberships,
        currentTenant,
        setCurrentTenant,
        refreshMemberships, // Provider를 통해 함수 노출
        loading,
        signUp,
        signIn,
        signOut,
        isSuperAdmin,
        isCompanyAdmin,
        signupRequest,
        isPendingApproval,
        isSuspended,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};