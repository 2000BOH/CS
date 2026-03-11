// 전역 상태
let supabase = null;
let currentUser = null;
let currentPage = 'input';
let complaints = [];
let selectedComplaint = null;
let viewMode = {}; // 각 페이지별 뷰 모드 (card/table)

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  // Supabase 클라이언트 초기화
  if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    initApp();
  } else {
    console.error('Supabase CDN이 로드되지 않았습니다.');
    document.body.innerHTML = '<div style="padding: 40px; text-align: center; font-family: sans-serif;"><h1>로딩 오류</h1><p>Supabase 라이브러리를 로드할 수 없습니다.</p><p>인터넷 연결을 확인해주세요.</p></div>';
  }
});

// 앱 초기화
function initApp() {
  // 로그인 상태 확인
  const savedUserId = localStorage.getItem('currentUserId');
  if (savedUserId && USERS[savedUserId]) {
    currentUser = { id: savedUserId, ...USERS[savedUserId] };
    showMainApp();
  } else {
    showLoginScreen();
  }
}

// 로그인 화면 표시
function showLoginScreen() {
  const loginGrid = document.getElementById('loginGrid');
  loginGrid.innerHTML = '';
  
  Object.entries(USERS).forEach(([id, user]) => {
    const button = document.createElement('button');
    button.className = 'login-btn';
    button.textContent = `${id} - ${user.name}`;
    button.onclick = () => login(id);
    loginGrid.appendChild(button);
  });
  
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
}

// 로그인
function login(userId) {
  currentUser = { id: userId, ...USERS[userId] };
  localStorage.setItem('currentUserId', userId);
  showMainApp();
  
  // 10번 사용자는 객실정비 페이지로
  if (userId === '10') {
    changePage('cleaning');
  }
}

// 로그아웃
function logout() {
  currentUser = null;
  localStorage.removeItem('currentUserId');
  showLoginScreen();
}

// 메인 앱 표시
async function showMainApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('currentUserName').textContent = `${currentUser.name}님`;
  
  // 10번 사용자는 객실정비만 표시
  if (currentUser.id === '10') {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.dataset.page !== 'cleaning') {
        tab.style.display = 'none';
      }
    });
  }
  
  // 이벤트 리스너 설정
  setupEventListeners();
  
  // 데이터 로드
  await loadComplaints();
  
  // 현재 페이지 렌더링
  renderCurrentPage();
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 로그아웃
  document.getElementById('logoutBtn').onclick = logout;
  
  // 네비게이션
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.onclick = () => changePage(tab.dataset.page);
  });
  
  // 민원 등록 폼
  document.getElementById('complaintForm').onsubmit = handleComplaintSubmit;
  document.getElementById('formResetBtn').onclick = resetComplaintForm;
  
  // 호실 이력 조회
  document.getElementById('historySearchBtn').onclick = searchHistory;
  
  // 필터
  const filterStatus = document.getElementById('filter-status');
  const filterCategory = document.getElementById('filter-category');
  const filterChasu = document.getElementById('filter-chasu');
  const filterRoom = document.getElementById('filter-room');
  
  if (filterStatus) filterStatus.addEventListener('change', renderCurrentPage);
  if (filterCategory) filterCategory.addEventListener('change', renderCurrentPage);
  if (filterChasu) filterChasu.addEventListener('change', renderCurrentPage);
  if (filterRoom) filterRoom.addEventListener('input', renderCurrentPage);
  
  // 영선 필터
  const maintenanceFilter = document.getElementById('maintenance-filter-status');
  if (maintenanceFilter) maintenanceFilter.addEventListener('change', renderCurrentPage);
  
  // 뷰 전환
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = (e) => {
      const page = e.target.closest('.page').id.replace('page-', '');
      const view = e.target.dataset.view;
      viewMode[page] = view;
      e.target.parentElement.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderCurrentPage();
    };
  });
  
  // 모달 닫기
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = closeModal;
  });
  
  // 모달 배경 클릭 시 닫기
  document.querySelectorAll('.modal').forEach(modal => {
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  });
  
  // 수정/삭제 버튼
  const editBtn = document.getElementById('editBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const editForm = document.getElementById('editForm');
  
  if (editBtn) editBtn.onclick = showEditModal;
  if (deleteBtn) deleteBtn.onclick = deleteComplaint;
  if (editForm) editForm.onsubmit = handleEditSubmit;
}

// 페이지 변경
function changePage(page) {
  currentPage = page;
  
  // 네비게이션 활성화
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === page);
  });
  
  // 페이지 표시
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });
  
  renderCurrentPage();
}

// Supabase에서 데이터 로드
async function loadComplaints() {
  if (!supabase) return;
  
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('등록일시', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('테이블이 아직 생성되지 않았습니다. 안내 페이지에서 SQL을 실행하세요.');
        complaints = [];
        return;
      }
      console.error('데이터 로드 오류:', error);
      return;
    }
    
    complaints = data || [];
  } catch (err) {
    console.error('데이터 로드 예외:', err);
    complaints = [];
  }
}

// 현재 페이지 렌더링
function renderCurrentPage() {
  switch (currentPage) {
    case 'input':
      // 입력 페이지는 폼만 있음
      break;
    case 'all':
      renderAllComplaints();
      break;
    case 'maintenance':
      renderMaintenance();
      break;
    case 'roommove':
      renderRoomMove();
      break;
    case 'cleaning':
      renderCleaning();
      break;
    case 'info':
      // 안내 페이지는 정적 콘텐츠
      break;
  }
}

// 전체조회 페이지 렌더링
function renderAllComplaints() {
  const filterStatus = document.getElementById('filter-status').value;
  const filterCategory = document.getElementById('filter-category').value;
  const filterChasu = document.getElementById('filter-chasu').value;
  const filterRoom = document.getElementById('filter-room').value;
  
  let filtered = complaints.filter(c => {
    if (filterStatus && c.상태 !== filterStatus) return false;
    if (filterCategory && c.구분 !== filterCategory) return false;
    if (filterChasu && c.차수 !== filterChasu) return false;
    if (filterRoom && !c.호실.includes(filterRoom)) return false;
    return true;
  });
  
  // 통계 업데이트
  updateStats(filtered);
  
  // 리스트 렌더링
  const container = document.getElementById('allComplaintsList');
  const view = viewMode['all'] || 'card';
  
  if (view === 'card') {
    renderCardView(container, filtered);
  } else {
    renderTableView(container, filtered);
  }
}

// 통계 업데이트
function updateStats(filtered) {
  document.getElementById('stat-total').textContent = filtered.length;
  
  const statuses = ['접수', '영선팀', '진행중', '부서이관', '외부업체', '완료'];
  statuses.forEach(status => {
    const count = filtered.filter(c => c.상태 === status).length;
    const elem = document.getElementById(`stat-${status}`);
    if (elem) elem.textContent = count;
  });
}

// 카드뷰 렌더링
function renderCardView(container, list) {
  container.className = 'complaints-list card-view';
  container.innerHTML = '';
  
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">데이터가 없습니다</div>';
    return;
  }
  
  list.forEach(complaint => {
    const card = document.createElement('div');
    card.className = 'complaint-card';
    if (complaint.우선처리) card.classList.add('priority');
    
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <span class="badge" style="background: ${STATUS_COLORS[complaint.상태]}">${complaint.상태}</span>
          <span class="badge" style="background: ${CATEGORY_COLORS[complaint.구분]}">${complaint.구분}</span>
          ${complaint.우선처리 ? '<span class="priority-badge">⭐ 우선</span>' : ''}
        </div>
        <div class="card-room">${complaint.차수} ${complaint.호실}</div>
      </div>
      <div class="card-body">
        <div class="card-content">${complaint.내용}</div>
        ${complaint.조치사항 ? `<div class="card-action">조치: ${complaint.조치사항}</div>` : ''}
      </div>
      <div class="card-footer">
        <div class="card-date" title="${formatDateTime(complaint.등록일시)}">${formatDate(complaint.등록일시)}</div>
        <div class="card-user">${complaint.등록자}</div>
        ${complaint.사진 && complaint.사진.length > 0 ? `<div class="card-photos">📷 ${complaint.사진.length}</div>` : ''}
      </div>
    `;
    
    card.onclick = () => showDetail(complaint);
    container.appendChild(card);
  });
}

// 테이블뷰 렌더링
function renderTableView(container, list) {
  container.className = 'complaints-list table-view';
  container.innerHTML = '';
  
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">데이터가 없습니다</div>';
    return;
  }
  
  const table = document.createElement('table');
  table.className = 'complaints-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>상태</th>
        <th>구분</th>
        <th>차수</th>
        <th>호실</th>
        <th>내용</th>
        <th>조치사항</th>
        <th>등록일</th>
        <th>등록자</th>
        <th>사진</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  
  const tbody = table.querySelector('tbody');
  list.forEach(complaint => {
    const tr = document.createElement('tr');
    if (complaint.우선처리) tr.classList.add('priority-row');
    
    tr.innerHTML = `
      <td>
        <span class="badge clickable" style="background: ${STATUS_COLORS[complaint.상태]}" 
              onclick="quickEditStatus('${complaint.id}', event)">${complaint.상태}</span>
      </td>
      <td>
        <span class="badge clickable" style="background: ${CATEGORY_COLORS[complaint.구분]}"
              onclick="quickEditCategory('${complaint.id}', event)">${complaint.구분}</span>
      </td>
      <td class="nowrap">${complaint.차수}</td>
      <td class="nowrap">${complaint.호실}</td>
      <td class="content-cell">${complaint.내용}</td>
      <td class="content-cell">${complaint.조치사항 || '-'}</td>
      <td class="nowrap" title="${formatDateTime(complaint.등록일시)}">${formatDate(complaint.등록일시)}</td>
      <td class="nowrap">${complaint.등록자}</td>
      <td class="center">
        ${complaint.사진 && complaint.사진.length > 0 
          ? `<span class="photo-count clickable" onclick="showPhotos('${complaint.id}', event)">📷 ${complaint.사진.length}</span>` 
          : '-'}
      </td>
    `;
    
    tr.onclick = (e) => {
      if (!e.target.classList.contains('clickable')) {
        showDetail(complaint);
      }
    };
    
    tbody.appendChild(tr);
  });
  
  container.appendChild(table);
}

// 영선 페이지 렌더링
function renderMaintenance() {
  const filterStatus = document.getElementById('maintenance-filter-status').value;
  
  let filtered = complaints.filter(c => {
    if (filterStatus && c.상태 !== filterStatus) return false;
    return c.상태 === '영선팀' || c.상태 === '진행중' || c.상태 === '완료';
  });
  
  const container = document.getElementById('maintenanceList');
  const view = viewMode['maintenance'] || 'card';
  
  if (view === 'card') {
    renderCardView(container, filtered);
  } else {
    renderTableView(container, filtered);
  }
}

// 객실이동 페이지 렌더링
function renderRoomMove() {
  const filtered = complaints.filter(c => c.구분 === 'D' || c.구분 === 'E');
  
  const container = document.getElementById('roommoveList');
  const view = viewMode['roommove'] || 'card';
  
  if (view === 'card') {
    renderCardView(container, filtered);
  } else {
    renderTableView(container, filtered);
  }
}

// 객실정비 페이지 렌더링
function renderCleaning() {
  const filtered = complaints.filter(c => c.구분 === 'F' || c.구분 === 'G');
  
  const container = document.getElementById('cleaningList');
  const view = viewMode['cleaning'] || 'card';
  
  if (view === 'card') {
    renderCardView(container, filtered);
  } else {
    renderTableView(container, filtered);
  }
}

// 민원 등록
async function handleComplaintSubmit(e) {
  e.preventDefault();
  
  if (!supabase) {
    alert('데이터베이스 연결이 없습니다.');
    return;
  }
  
  const complaint = {
    id: generateId(),
    차수: document.getElementById('form-chasu').value,
    호실: document.getElementById('form-room').value,
    구분: document.getElementById('form-category').value,
    내용: document.getElementById('form-content').value,
    조치사항: document.getElementById('form-action').value,
    상태: '접수',
    등록일시: new Date().toISOString(),
    등록자: currentUser.name,
    우선처리: document.getElementById('form-priority').checked,
    사진: [] // 간단하게 사진은 제외
  };
  
  const { error } = await supabase
    .from('complaints')
    .insert([complaint]);
  
  if (error) {
    alert('등록 실패: ' + error.message);
    return;
  }
  
  alert('등록되었습니다');
  resetComplaintForm();
  await loadComplaints();
  renderCurrentPage();
}

// 폼 초기화
function resetComplaintForm() {
  document.getElementById('complaintForm').reset();
  const preview = document.getElementById('photoPreview');
  if (preview) preview.innerHTML = '';
}

// 호실 이력 조회
function searchHistory() {
  const chasu = document.getElementById('history-chasu').value;
  const room = document.getElementById('history-room').value;
  
  let filtered = complaints.filter(c => {
    if (chasu && c.차수 !== chasu) return false;
    if (room && c.호실 !== room) return false;
    return true;
  });
  
  const container = document.getElementById('historyResult');
  renderCardView(container, filtered);
}

// 상세보기
function showDetail(complaint) {
  selectedComplaint = complaint;
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('detailContent');
  
  content.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <label>상태</label>
        <span class="badge" style="background: ${STATUS_COLORS[complaint.상태]}">${complaint.상태}</span>
      </div>
      <div class="detail-item">
        <label>구분</label>
        <span class="badge" style="background: ${CATEGORY_COLORS[complaint.구분]}">${complaint.구분}</span>
      </div>
      <div class="detail-item">
        <label>차수</label>
        <span>${complaint.차수}</span>
      </div>
      <div class="detail-item">
        <label>호실</label>
        <span>${complaint.호실}</span>
      </div>
      <div class="detail-item full">
        <label>내용</label>
        <span>${complaint.내용}</span>
      </div>
      <div class="detail-item full">
        <label>조치사항</label>
        <span>${complaint.조치사항 || '-'}</span>
      </div>
      <div class="detail-item">
        <label>등록일시</label>
        <span>${formatDateTime(complaint.등록일시)}</span>
      </div>
      <div class="detail-item">
        <label>등록자</label>
        <span>${complaint.등록자}</span>
      </div>
      ${complaint.우선처리 ? '<div class="detail-item"><label>우선처리</label><span>⭐ 예</span></div>' : ''}
    </div>
  `;
  
  modal.style.display = 'flex';
}

// 수정 모달
function showEditModal() {
  closeModal();
  
  const modal = document.getElementById('editModal');
  document.getElementById('edit-id').value = selectedComplaint.id;
  document.getElementById('edit-status').value = selectedComplaint.상태;
  document.getElementById('edit-action').value = selectedComplaint.조치사항 || '';
  
  modal.style.display = 'flex';
}

// 수정 저장
async function handleEditSubmit(e) {
  e.preventDefault();
  
  if (!supabase) {
    alert('데이터베이스 연결이 없습니다.');
    return;
  }
  
  const id = document.getElementById('edit-id').value;
  const status = document.getElementById('edit-status').value;
  const action = document.getElementById('edit-action').value;
  
  const updates = {
    상태: status,
    조치사항: action,
    updated_at: new Date().toISOString()
  };
  
  if (status === '완료' && !selectedComplaint.완료일시) {
    updates.완료일시 = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('complaints')
    .update(updates)
    .eq('id', id);
  
  if (error) {
    alert('수정 실패: ' + error.message);
    return;
  }
  
  alert('수정되었습니다');
  closeModal();
  await loadComplaints();
  renderCurrentPage();
}

// 삭제
async function deleteComplaint() {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  
  if (!supabase) {
    alert('데이터베이스 연결이 없습니다.');
    return;
  }
  
  const { error } = await supabase
    .from('complaints')
    .delete()
    .eq('id', selectedComplaint.id);
  
  if (error) {
    alert('삭제 실패: ' + error.message);
    return;
  }
  
  alert('삭제되었습니다');
  closeModal();
  await loadComplaints();
  renderCurrentPage();
}

// 빠른 상태 수정
async function quickEditStatus(id, e) {
  e.stopPropagation();
  
  if (!supabase) return;
  
  const statuses = ['접수', '영선팀', '진행중', '부서이관', '외부업체', '완료'];
  const currentComplaint = complaints.find(c => c.id === id);
  const currentIndex = statuses.indexOf(currentComplaint.상태);
  const nextStatus = statuses[(currentIndex + 1) % statuses.length];
  
  const updates = { 상태: nextStatus, updated_at: new Date().toISOString() };
  if (nextStatus === '완료' && !currentComplaint.완료일시) {
    updates.완료일시 = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('complaints')
    .update(updates)
    .eq('id', id);
  
  if (!error) {
    await loadComplaints();
    renderCurrentPage();
  }
}

// 빠른 구분 수정
async function quickEditCategory(id, e) {
  e.stopPropagation();
  
  if (!supabase) return;
  
  const categories = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const currentComplaint = complaints.find(c => c.id === id);
  const currentIndex = categories.indexOf(currentComplaint.구분);
  const nextCategory = categories[(currentIndex + 1) % categories.length];
  
  const { error } = await supabase
    .from('complaints')
    .update({ 구분: nextCategory, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (!error) {
    await loadComplaints();
    renderCurrentPage();
  }
}

// 사진 보기
function showPhotos(id, e) {
  e.stopPropagation();
  
  const complaint = complaints.find(c => c.id === id);
  if (complaint.사진 && complaint.사진.length > 0) {
    const modal = document.getElementById('photoModal');
    const img = document.getElementById('photoModalImg');
    img.src = complaint.사진[0];
    modal.style.display = 'flex';
  }
}

// 모달 닫기
function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

// 유틸리티 함수
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const year = String(date.getFullYear()).substr(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const year = String(date.getFullYear()).substr(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}`;
}
