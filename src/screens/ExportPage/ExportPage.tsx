import React, { useEffect, useRef, useState } from 'react';
import { Col, Form, Row } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import { useQuery } from '@apollo/client';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import styles from './ExportPage.module.css';
import AdminNavbar from 'components/AdminNavbar/AdminNavbar';
import type { RootState } from 'state/reducers';
import { useTranslation } from 'react-i18next';
import PaginationList from 'components/PaginationList/PaginationList';
import { errorHandler } from 'utils/errorHandler';
import debounce from 'utils/debounce';
import { CircularProgress } from '@mui/material';
import { ORGANIZATIONS_MEMBER_CONNECTION_LIST } from 'GraphQl/Queries/Queries';
import { read, utils, write } from 'xlsx';
import { gql } from '@apollo/client';
import { USER_LIST } from 'GraphQl/Queries/Queries';
interface InterfaceMember {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  organizationsBlockedBy: {
    _id: string;
    __typename: 'Organization';
  }[];
}
const GET_ORGANIZATION = gql`
  query GetOrganizations($id: ID, $orderBy: OrganizationOrderByInput) {
    organizations(id: $id, orderBy: $orderBy) {
      _id
      name
    }
  }
`;
const ExportPage = (): JSX.Element => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'exportPage',
  });
  const appRoutes = useSelector((state: RootState) => state.appRoutes);
  const { targets, configUrl } = appRoutes;
  const {
    loading: orgLoading,
    error: orgError,
    data: orgData,
  } = useQuery(GET_ORGANIZATION, {
    variables: {},
  });
  console.log(orgData);

  document.title = t('title');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const currentUrl = window.location.href.split('=')[1];

  const [membersData, setMembersData] = useState<InterfaceMember[]>([]);
  const [usersForDownload, setUsersForDownload] = useState<InterfaceMember[]>(
    []
  );
  const [state, setState] = useState(0);

  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const {
    data: memberData,
    loading: memberLoading,
    error: memberError,
    refetch: memberRefetch,
  } = useQuery(ORGANIZATIONS_MEMBER_CONNECTION_LIST, {
    variables: {
      orgId: currentUrl,
      firstName_contains: '',
      lastName_contains: '',
    },
  });

  useEffect(() => {
    if (!memberData) {
      setMembersData([]);
      return;
    }

    setMembersData(memberData?.organizationsMemberConnection.edges);

    if (organizationId !== undefined) {
      memberRefetch({
        orgId: organizationId,
        firstName_contains: firstNameRef.current?.value ?? '',
        lastName_contains: lastNameRef.current?.value ?? '',
      });
    }
  }, [state, memberData, organizationId]);

  /* istanbul ignore next */
  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ): void => {
    setPage(newPage);
  };

  /* istanbul ignore next */
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /* istanbul ignore next */
  if (memberError) {
    toast.error(memberError.message);
  }

  const handleSearch = (): void => {
    let orgSearch = currentUrl;
    if (organizationId !== undefined) {
      orgSearch = organizationId;
    }
    const filterData = {
      orgId: orgSearch,
      firstName_contains: firstNameRef.current?.value ?? '',
      lastName_contains: lastNameRef.current?.value ?? '',
      email_contains: emailRef.current?.value ?? '',
    };

    memberRefetch(filterData);
  };

  const handleSearchDebounced = debounce(handleSearch);
  const downloadExcel = async (userInfo: InterfaceMember[]): Promise<void> => {
    if (userInfo.length === 0) {
      alert('No users to download.');
      return;
    }

    // add organization data to each user and format createdAt date
    const usersWithOrg = userInfo.map((user) => {
      let formattedDate = user.createdAt;
      if (user.createdAt) {
        const dateObj = new Date(user.createdAt);
        formattedDate = `${
          dateObj.getMonth() + 1
        }/${dateObj.getDate()}/${dateObj.getFullYear()}`;
      }

      return {
        ...user,
        organizations: JSON.stringify(orgData),
        createdAt: formattedDate,
      };
    });

    const ws = utils.json_to_sheet(usersWithOrg);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'user info');
    const wbout = write(wb, { bookType: 'csv', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const anchor = document.createElement('a');
    anchor.download = orgData.organizations[0].name + '-users' + '.csv';
    // anchor.download = 'users.csv';
    anchor.href = URL.createObjectURL(blob);
    anchor.click();
  };

  const handleCheckboxChange = (user: InterfaceMember): void => {
    if (usersForDownload.includes(user)) {
      setUsersForDownload(usersForDownload.filter((u) => u !== user));
    } else {
      setUsersForDownload([...usersForDownload, user]);
    }
  };
  const handleOrganizationChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    setOrganizationId(
      event.target.value === 'reset' ? undefined : event.target.value
    );
  };
  return (
    <>
      <AdminNavbar targets={targets} url1={configUrl} />
      <Row>
        <Col sm={3}>
          <div className={styles.sidebar}>
            <div className={styles.sidebarsticky}>
              <h6 className={styles.searchtitle}>{t('searchByName')}</h6>
              <Form.Control
                type="name"
                id="firstName"
                placeholder={t('searchFirstName')}
                name="firstName_contains"
                data-testid="searchByFirstName"
                autoComplete="off"
                onChange={handleSearchDebounced}
                ref={firstNameRef}
              />

              <Form.Control
                type="name"
                id="lastName"
                placeholder={t('searchLastName')}
                name="lastName_contains"
                data-testid="searchByLastName"
                autoComplete="off"
                onChange={handleSearchDebounced}
                ref={lastNameRef}
              />
              {/* <Form.Control
                type="email"
                id="email"
                placeholder={t('searchEmail')}
                name="email_contains"
                data-testid="searchByEmail"
                autoComplete="off"
                onChange={handleSearchDebounced}
                ref={emailRef}
              /> */}
              <select
                onChange={handleOrganizationChange}
                value={organizationId ?? 'reset'}
              >
                <option value="reset">Select organization</option>
                {orgData &&
                  orgData.organizations &&
                  orgData.organizations.map(
                    (org: { _id: string; name: string }) => (
                      <option key={org._id} value={org._id}>
                        {org.name}
                      </option>
                    )
                  )}
              </select>
              <div className={styles.radio_buttons} data-testid="usertypelist">
                <button
                  className={styles.downloadBtn}
                  onClick={async (): Promise<void> => {
                    await downloadExcel(usersForDownload);
                  }}
                >
                  {t('export')}
                </button>
              </div>
            </div>
          </div>
        </Col>

        <Col sm={8}>
          <div className={styles.mainpageright}>
            <Row className={styles.justifysp}>
              <p className={styles.logintitle}>{t('listOfUsers')}</p>
            </Row>
            {memberLoading ? (
              <div className={styles.loader}>
                <CircularProgress />
              </div>
            ) : (
              <div className={styles.list_box}>
                <div className="table-responsive">
                  <table
                    className={`table table-hover ${styles.userListTable}`}
                  >
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">{t('name')}</th>
                        <th scope="col">{t('email')}</th>
                        <th scope="col" className="text-center">
                          {t('addToList')}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {
                        /* istanbul ignore next */
                        (rowsPerPage > 0
                          ? membersData.slice(
                              page * rowsPerPage,
                              page * rowsPerPage + rowsPerPage
                            )
                          : membersData
                        ).map((user, index: number) => {
                          return (
                            <tr key={user._id} className={styles.btn_box}>
                              <th scope="row">{page * 10 + (index + 1)}</th>
                              <td>{`${user.firstName} ${user.lastName}`}</td>
                              <td>{user.email}</td>
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  onClick={async (): Promise<void> => {
                                    await handleCheckboxChange(user);
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div>
              <table
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <tbody>
                  <tr>
                    <PaginationList
                      count={membersData.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Col>
      </Row>
    </>
  );
};

export default ExportPage;
