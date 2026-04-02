-- 회원가입 시 첫 사용자를 Boteda 본사 company_admin으로 자동 설정하는 함수
CREATE OR REPLACE FUNCTION public.auto_assign_first_user_to_boteda()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  boteda_tenant_id uuid;
  membership_count integer;
BEGIN
  -- Boteda 본사 테넌트 ID 조회
  SELECT id INTO boteda_tenant_id FROM tenants WHERE name = 'Boteda 본사' LIMIT 1;
  
  -- 테넌트가 없으면 종료
  IF boteda_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- 현재 멤버십 수 확인
  SELECT COUNT(*) INTO membership_count FROM tenant_memberships;
  
  -- 첫 번째 사용자인 경우 (멤버십이 없는 경우)
  IF membership_count = 0 THEN
    -- Boteda 본사에 company_admin으로 추가
    INSERT INTO tenant_memberships (user_id, tenant_id, role, department, job_title)
    VALUES (NEW.id, boteda_tenant_id, 'company_admin', '경영지원', '시스템 관리자');
    
    -- 시스템 슈퍼 어드민 권한도 부여
    UPDATE profiles SET system_role = 'sys_super_admin' WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 프로필 생성 후 트리거 실행
DROP TRIGGER IF EXISTS on_profile_created_assign_first_user ON profiles;
CREATE TRIGGER on_profile_created_assign_first_user
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_first_user_to_boteda();